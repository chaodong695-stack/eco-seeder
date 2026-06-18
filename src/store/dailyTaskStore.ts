/**
 * 每日任务状态管理 — Zustand Store。
 *
 * 每日任务状态的唯一事实来源。
 * React UI 通过 hook 订阅，Phaser 通过 getState() 获取。
 * localStorage 只是持久化介质，不是运行时事实来源。
 *
 * 任务系统只读使用 worldStore 暴露的时间、天气和天气时间线。
 */

import { create } from 'zustand';
import type { DailyTaskInstance, DailyTaskStatus, TaskProgressSignal } from '@/domain/tasks/dailyTaskTypes';
import {
  DAILY_TASK_DEFINITIONS,
  DAILY_TASK_POOL_VERSION,
  findDailyTaskById,
} from '@/domain/tasks/dailyTaskDefinitions';
import { generateDailyTasks } from '@/domain/tasks/dailyTaskGenerator';
import {
  resolveTaskStatus,
  extractWeatherTypesFromTimeline,
} from '@/domain/tasks/dailyTaskConditionResolver';
import { reduceTaskProgress } from '@/domain/tasks/dailyTaskProgressReducer';
import {
  saveDailyTasks,
  loadDailyTasks,
  clearDailyTasks,
  isPersistDataValid,
  type DailyTaskPersistData,
} from '@/domain/tasks/dailyTaskPersistence';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useWorldStore } from '@/store/worldStore';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { ANONYMOUS_PLAYER_ID } from '@/domain/time/worldTimeService';
import type { WeatherType } from '@/domain/weather/weatherTypes';

/** 地图 ID 常量。 */
const MAP_ID = V0_1_MAIN_MAP_IDENTITY.id;

interface DailyTaskStoreState {
  /** 当日任务实例列表。 */
  tasks: DailyTaskInstance[];
  /** 当前日期。 */
  localDate: string;
  /** 是否已初始化。 */
  isInitialized: boolean;
  /** 已贡献进度的 source ID 集合（防重复）。 */
  contributedSources: Set<string>;

  /** 初始化每日任务（幂等）。 */
  init: () => void;
  /** 根据当前天气刷新任务状态（active ↔ waiting_condition）。 */
  refreshWeatherConditions: () => void;
  /** 接取任务。 */
  acceptTask: (taskId: string) => boolean;
  /** 应用进度信号。 */
  applyProgress: (signal: TaskProgressSignal) => void;
  /** 获取指定 NPC 负责的任务列表。 */
  getTasksByNpcId: (npcId: string) => DailyTaskInstance[];
  /** 获取所有任务（含定义信息）。 */
  getAllTasks: () => DailyTaskInstance[];
  /** 重置（返回开始页时调用）。 */
  resetDailyTasks: () => void;
}

/**
 * 持久化当前任务到 localStorage。
 */
function persistTasks(
  tasks: DailyTaskInstance[],
  localDate: string,
): void {
  const data: DailyTaskPersistData = {
    date: localDate,
    mapId: MAP_ID,
    poolVersion: DAILY_TASK_POOL_VERSION,
    tasks,
  };
  saveDailyTasks(data);
}

/**
 * 从天气时间线提取可用天气类型。
 */
function getAvailableWeatherTypes(): WeatherType[] {
  const timeline = useWorldStore.getState().getWeatherTimeline();
  if (!timeline) return [];
  return extractWeatherTypesFromTimeline(timeline.entries);
}

/**
 * 获取当前显示天气（预览优先）。
 */
function getCurrentDisplayWeather(): WeatherType {
  return useWorldStore.getState().getDisplayWeather();
}

export const useDailyTaskStore = create<DailyTaskStoreState>((set, get) => ({
  tasks: [],
  localDate: '',
  isInitialized: false,
  contributedSources: new Set<string>(),

  init: () => {
    const state = get();
    if (state.isInitialized) return;

    const worldStore = useWorldStore.getState();
    const localDate = worldStore.timeSnapshot.localDate;

    // 尝试从 localStorage 恢复
    const persisted = loadDailyTasks();
    if (isPersistDataValid(persisted, localDate, MAP_ID, DAILY_TASK_POOL_VERSION)) {
      // 恢复后根据当前天气刷新状态
      const currentWeather = getCurrentDisplayWeather();
      const refreshedTasks = persisted.tasks.map((inst) => {
        const def = findDailyTaskById(inst.taskId);
        if (!def) return inst;
        if (inst.status === 'completed') return inst;
        if (inst.status === 'available') return inst;
        const newStatus = resolveTaskStatus(def, inst.status, currentWeather);
        return { ...inst, status: newStatus };
      });

      set({
        tasks: refreshedTasks,
        localDate,
        isInitialized: true,
        contributedSources: new Set<string>(),
      });
      persistTasks(refreshedTasks, localDate);
      gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: refreshedTasks });
      return;
    }

    // 生成新任务
    const availableWeatherTypes = getAvailableWeatherTypes();
    const newTasks = generateDailyTasks(
      {
        anonymousPlayerId: ANONYMOUS_PLAYER_ID,
        localDate,
        mapId: MAP_ID,
        dailyTaskPoolVersion: DAILY_TASK_POOL_VERSION,
        availableWeatherTypes,
      },
      DAILY_TASK_DEFINITIONS,
    );

    set({
      tasks: newTasks,
      localDate,
      isInitialized: true,
      contributedSources: new Set<string>(),
    });
    persistTasks(newTasks, localDate);
    gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: newTasks });
  },

  refreshWeatherConditions: () => {
    const state = get();
    if (!state.isInitialized) return;

    const currentWeather = getCurrentDisplayWeather();
    let changed = false;

    const updatedTasks = state.tasks.map((inst) => {
      const def = findDailyTaskById(inst.taskId);
      if (!def) return inst;
      if (inst.status === 'completed') return inst;
      if (inst.status === 'available') return inst;

      const newStatus = resolveTaskStatus(def, inst.status, currentWeather);
      if (newStatus !== inst.status) {
        changed = true;
        gameBridge.emit('DAILY_TASK_STATUS_CHANGED', {
          instanceId: inst.instanceId,
          taskId: inst.taskId,
          previousStatus: inst.status,
          currentStatus: newStatus,
        });
        return { ...inst, status: newStatus };
      }
      return inst;
    });

    if (changed) {
      set({ tasks: updatedTasks });
      persistTasks(updatedTasks, state.localDate);
    }
  },

  acceptTask: (taskId: string): boolean => {
    const state = get();
    const inst = state.tasks.find((t) => t.taskId === taskId);
    if (!inst || inst.status !== 'available') return false;

    const def = findDailyTaskById(taskId);
    if (!def) return false;

    const currentWeather = getCurrentDisplayWeather();
    const newStatus: DailyTaskStatus = resolveTaskStatus(def, 'active', currentWeather);

    const updatedTasks = state.tasks.map((t) =>
      t.taskId === taskId ? { ...t, status: newStatus } : t,
    );

    set({ tasks: updatedTasks });
    persistTasks(updatedTasks, state.localDate);

    gameBridge.emit('DAILY_TASK_STATUS_CHANGED', {
      instanceId: inst.instanceId,
      taskId,
      previousStatus: 'available',
      currentStatus: newStatus,
    });

    return true;
  },

  applyProgress: (signal: TaskProgressSignal) => {
    const state = get();
    let changed = false;
    // 复制 contributedSources 以确保 Zustand 检测到变更
    const newContributedSources = new Set(state.contributedSources);

    const updatedTasks = state.tasks.map((inst) => {
      const def = findDailyTaskById(inst.taskId);
      if (!def) return inst;
      if (def.objectiveType !== signal.objectiveType) return inst;

      const result = reduceTaskProgress(inst, signal, newContributedSources);
      if (result.changed) {
        changed = true;
        gameBridge.emit('DAILY_TASK_PROGRESS_CHANGED', {
          instanceId: result.instance.instanceId,
          taskId: result.instance.taskId,
          progress: result.instance.progress,
          targetValue: result.instance.targetValue,
        });
        if (result.justCompleted) {
          gameBridge.emit('DAILY_TASK_COMPLETED', {
            instanceId: result.instance.instanceId,
            taskId: result.instance.taskId,
          });
        }
      }
      return result.instance;
    });

    if (changed) {
      set({ tasks: updatedTasks, contributedSources: newContributedSources });
      persistTasks(updatedTasks, state.localDate);
    }
  },

  getTasksByNpcId: (npcId: string): DailyTaskInstance[] => {
    const state = get();
    return state.tasks.filter((inst) => {
      const def = findDailyTaskById(inst.taskId);
      return def?.npcId === npcId;
    });
  },

  getAllTasks: (): DailyTaskInstance[] => {
    return get().tasks;
  },

  resetDailyTasks: () => {
    clearDailyTasks();
    set({
      tasks: [],
      localDate: '',
      isInitialized: false,
      contributedSources: new Set<string>(),
    });
  },
}));
