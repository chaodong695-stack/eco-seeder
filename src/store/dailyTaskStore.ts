/**
 * 每日任务状态管理 — Zustand Store。
 *
 * 每日任务状态的唯一事实来源。
 * React UI 通过 hook 订阅，Phaser 通过 getState() 获取。
 * localStorage 只是持久化介质，不是运行时事实来源。
 *
 * 任务系统只读使用 worldStore 暴露的时间、天气和天气时间线。
 *
 * DEV-06 第四轮修复：
 * - 持久化 contributedSources，刷新后防重复 sourceId；
 * - 任务完成时应用 reward.restorationValue 到 environmentStore；
 * - 持久化 restorationProgress，保证任务完成与区域修复进度一致。
 *
 * DEV-06 第五轮修复：
 * - 移除 onCharacterChange，统一由 resetWorldSession() 重置所有世界状态；
 * - 新一局（返回开始页 / 刷新页面 / 切换角色）时调用 resetWorldSession；
 * - resetDailyTasks 不再重置 environmentStore（由 resetWorldSession 统一处理）。
 */

import { create } from 'zustand';
import type { DailyTaskInstance, DailyTaskStatus, TaskProgressSignal } from '@/domain/tasks/dailyTaskTypes';
import {
  DAILY_TASK_POOL_VERSION,
  DAILY_TASKS_PER_DAY,
  findDailyTaskById,
  getCompletableTaskDefinitions,
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
import { useEnvironmentStore } from '@/store/environmentStore';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { ANONYMOUS_PLAYER_ID } from '@/domain/time/worldTimeService';
import { usePlayerStore } from '@/store/playerStore';
import type { WeatherType } from '@/domain/weather/weatherTypes';

/** 地图 ID 常量。 */
const MAP_ID = V0_1_MAIN_MAP_IDENTITY.id;

interface DailyTaskStoreState {
  /** 当日任务实例列表。 */
  tasks: DailyTaskInstance[];
  /** 当前日期。 */
  localDate: string;
  /** 当前选中角色 ID。 */
  selectedCharacterId: string;
  /** 是否已初始化。 */
  isInitialized: boolean;
  /** 已贡献进度的 source ID 集合（防重复）。 */
  contributedSources: Set<string>;

  /** 初始化每日任务（幂等）。 */
  init: () => void;
  /** 根据当前天气刷新任务状态（active ↔ waiting_condition）。 */
  refreshWeatherConditions: () => void;
  /** 接取任务。 */
  acceptTask: (instanceId: string) => boolean;
  /** 应用进度信号。 */
  applyProgress: (signal: TaskProgressSignal) => void;
  /** 获取指定 NPC 负责的任务列表。 */
  getTasksByNpcId: (npcId: string) => DailyTaskInstance[];
  /** 获取所有任务（含定义信息）。 */
  getAllTasks: () => DailyTaskInstance[];
  /** 重置（返回开始页、切换角色或新一局时调用）。 */
  resetDailyTasks: () => void;
}

/**
 * 从持久化数据中过滤掉重复的 taskId 或 instanceId。
 *
 * 如果存在重复，只保留第一个出现的实例。
 * 返回去重后的任务列表和是否有重复被移除的标志。
 */
function deduplicatePersistedTasks(
  tasks: DailyTaskInstance[],
): { tasks: DailyTaskInstance[]; hadDuplicates: boolean } {
  const seenTaskIds = new Set<string>();
  const seenInstanceIds = new Set<string>();
  const result: DailyTaskInstance[] = [];
  let hadDuplicates = false;

  for (const inst of tasks) {
    if (seenTaskIds.has(inst.taskId) || seenInstanceIds.has(inst.instanceId)) {
      hadDuplicates = true;
      continue;
    }
    seenTaskIds.add(inst.taskId);
    seenInstanceIds.add(inst.instanceId);
    result.push(inst);
  }

  return { tasks: result, hadDuplicates };
}

/**
 * 从 playerStore 获取当前选中角色 ID。
 */
function getSelectedCharacterId(): string {
  return usePlayerStore.getState().character?.characterId ?? 'character.default';
}

/**
 * 持久化当前任务到 localStorage。
 */
function persistTasks(
  tasks: DailyTaskInstance[],
  localDate: string,
  selectedCharacterId: string,
  contributedSources: Set<string>,
): void {
  const data: DailyTaskPersistData = {
    date: localDate,
    mapId: MAP_ID,
    poolVersion: DAILY_TASK_POOL_VERSION,
    selectedCharacterId,
    tasks,
    contributedSources: Array.from(contributedSources),
    restorationProgress: useEnvironmentStore.getState().state.restorationProgress,
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

/**
 * 应用任务完成奖励到 environmentStore。
 *
 * 同一任务奖励最多发放一次（由 rewardClaimed 标志保证）。
 */
function applyTaskReward(taskId: string): void {
  const def = findDailyTaskById(taskId);
  if (!def?.reward?.restorationValue) return;

  const envStore = useEnvironmentStore.getState();
  // 使用任务 instanceId 作为 targetId 防重复
  const rewardTargetId = `reward.${taskId}`;
  if (envStore.isEffectApplied(rewardTargetId)) return;

  envStore.applyEffect(rewardTargetId, {
    pollution: 0,
    vegetation: 0,
    waterQuality: 0,
    restorationProgress: def.reward.restorationValue,
  });
}

export const useDailyTaskStore = create<DailyTaskStoreState>((set, get) => ({
  tasks: [],
  localDate: '',
  selectedCharacterId: '',
  isInitialized: false,
  contributedSources: new Set<string>(),

  init: () => {
    const state = get();
    if (state.isInitialized) return;

    const worldStore = useWorldStore.getState();
    const localDate = worldStore.timeSnapshot.localDate;
    const selectedCharacterId = getSelectedCharacterId();

    // 尝试从 localStorage 恢复
    const persisted = loadDailyTasks();
    if (isPersistDataValid(persisted, localDate, MAP_ID, DAILY_TASK_POOL_VERSION, selectedCharacterId)) {
      // 过滤重复 taskId 或 instanceId
      const { tasks: dedupedTasks, hadDuplicates } = deduplicatePersistedTasks(
        persisted.tasks,
      );

      // 恢复 contributedSources
      const restoredContributedSources = new Set<string>(
        persisted.contributedSources ?? [],
      );

      // 恢复后根据当前天气刷新状态
      const currentWeather = getCurrentDisplayWeather();
      const refreshedTasks = dedupedTasks.map((inst) => {
        const def = findDailyTaskById(inst.taskId);
        if (!def) return inst;
        if (inst.status === 'completed') return inst;
        if (inst.status === 'available') return inst;
        const newStatus = resolveTaskStatus(def, inst.status, currentWeather);
        return { ...inst, status: newStatus };
      });

      // 如果有重复数据被移除或任务数量不足，重新生成
      if (hadDuplicates || refreshedTasks.length !== DAILY_TASKS_PER_DAY) {
        const availableWeatherTypes = getAvailableWeatherTypes();
        const newTasks = generateDailyTasks(
          {
            anonymousPlayerId: ANONYMOUS_PLAYER_ID,
            selectedCharacterId,
            localDate,
            mapId: MAP_ID,
            dailyTaskPoolVersion: DAILY_TASK_POOL_VERSION,
            availableWeatherTypes,
          },
          getCompletableTaskDefinitions(),
        );

        set({
          tasks: newTasks,
          localDate,
          selectedCharacterId,
          isInitialized: true,
          contributedSources: new Set<string>(),
        });
        persistTasks(newTasks, localDate, selectedCharacterId, new Set<string>());
        gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: newTasks });
        return;
      }

      set({
        tasks: refreshedTasks,
        localDate,
        selectedCharacterId,
        isInitialized: true,
        contributedSources: restoredContributedSources,
      });
      persistTasks(refreshedTasks, localDate, selectedCharacterId, restoredContributedSources);
      gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: refreshedTasks });
      return;
    }

    // 生成新任务
    const availableWeatherTypes = getAvailableWeatherTypes();
    const newTasks = generateDailyTasks(
      {
        anonymousPlayerId: ANONYMOUS_PLAYER_ID,
        selectedCharacterId,
        localDate,
        mapId: MAP_ID,
        dailyTaskPoolVersion: DAILY_TASK_POOL_VERSION,
        availableWeatherTypes,
      },
      getCompletableTaskDefinitions(),
    );

    set({
      tasks: newTasks,
      localDate,
      selectedCharacterId,
      isInitialized: true,
      contributedSources: new Set<string>(),
    });
    persistTasks(newTasks, localDate, selectedCharacterId, new Set<string>());
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
      persistTasks(updatedTasks, state.localDate, state.selectedCharacterId, state.contributedSources);
    }
  },

  acceptTask: (instanceId: string): boolean => {
    const state = get();
    const inst = state.tasks.find((t) => t.instanceId === instanceId);
    if (!inst || inst.status !== 'available') return false;

    const def = findDailyTaskById(inst.taskId);
    if (!def) return false;

    const currentWeather = getCurrentDisplayWeather();
    const newStatus: DailyTaskStatus = resolveTaskStatus(def, 'active', currentWeather);

    const updatedTasks = state.tasks.map((t) =>
      t.instanceId === instanceId ? { ...t, status: newStatus } : t,
    );

    set({ tasks: updatedTasks });
    persistTasks(updatedTasks, state.localDate, state.selectedCharacterId, state.contributedSources);

    gameBridge.emit('DAILY_TASK_STATUS_CHANGED', {
      instanceId,
      taskId: inst.taskId,
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
    // 获取当前天气用于进度校验
    const currentWeather = getCurrentDisplayWeather();

    const updatedTasks = state.tasks.map((inst) => {
      const def = findDailyTaskById(inst.taskId);
      if (!def) return inst;
      if (def.objectiveType !== signal.objectiveType) return inst;

      // 天气门控 — 在 Store 层再次校验当前天气条件
      if (
        def.condition?.supportedWeather &&
        def.condition.supportedWeather.length > 0 &&
        !def.condition.supportedWeather.includes(currentWeather)
      ) {
        return inst;
      }

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
          // 应用任务完成奖励到 environmentStore
          applyTaskReward(result.instance.taskId);

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
      persistTasks(updatedTasks, state.localDate, state.selectedCharacterId, newContributedSources);
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
      selectedCharacterId: '',
      isInitialized: false,
      contributedSources: new Set<string>(),
    });
  },
}));
