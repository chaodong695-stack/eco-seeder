/**
 * 持久化去重测试 — 验证 dailyTaskStore 加载持久化数据时拒绝重复 taskId 或 instanceId。
 *
 * 覆盖 Issue #16 第 1 点：
 * - dailyTaskStore 加载持久化数据时必须拒绝重复 taskId 或 instanceId；
 * - 已经存储的重复任务数据应自动失效并重新生成。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { DAILY_TASKS_STORAGE_KEY } from '@/domain/tasks/dailyTaskPersistence';
import type { DailyTaskInstance } from '@/domain/tasks/dailyTaskTypes';
import { gameBridge } from '@/game/bridge/GameBridge';

vi.mock('@/store/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      timeSnapshot: { localDate: '2025-06-18' },
      getWeatherTimeline: () => ({
        date: '2025-06-18',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [
          { id: '1', startMinute: 0, endMinute: 360, weather: 'clear', intensity: 0.2 },
          { id: '2', startMinute: 361, endMinute: 720, weather: 'light_rain', intensity: 0.6 },
          { id: '3', startMinute: 721, endMinute: 1080, weather: 'heavy_rain', intensity: 0.9 },
          { id: '4', startMinute: 1081, endMinute: 1439, weather: 'fog', intensity: 0.7 },
        ],
      }),
      getDisplayWeather: () => 'clear' as const,
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock playerStore
vi.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      character: { characterId: 'character.player_male', gender: 'male', displayName: '男性生态修复员' },
    }),
  },
}));

vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}));

function makeInstance(overrides: Partial<DailyTaskInstance> = {}): DailyTaskInstance {
  return {
    instanceId: 'inst-1',
    taskId: 'daily_collect_waste',
    localDate: '2025-06-18',
    mapId: 'map.urban_wasteland',
    status: 'available',
    progress: 0,
    targetValue: 3,
    rewardClaimed: false,
    ...overrides,
  };
}

describe('dailyTaskPersistenceDedup', () => {
  beforeEach(() => {
    localStorage.clear();
    useEnvironmentStore.getState().resetEnvironment();
    useDailyTaskStore.getState().resetDailyTasks();
    vi.clearAllMocks();
  });

  it('rejects duplicate taskIds in persisted data and regenerates', () => {
    // Seed localStorage with duplicate taskIds
    const duplicateData = {
      date: '2025-06-18',
      mapId: 'map.urban_wasteland',
      poolVersion: 'daily-tasks.v1',
      tasks: [
        makeInstance({ instanceId: 'inst-1', taskId: 'daily_collect_waste' }),
        makeInstance({ instanceId: 'inst-2', taskId: 'daily_collect_waste' }),
        makeInstance({ instanceId: 'inst-3', taskId: 'daily_restore_area' }),
      ],
    };
    localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(duplicateData));

    useDailyTaskStore.getState().init();
    const tasks = useDailyTaskStore.getState().tasks;

    // Should have exactly 3 unique tasks (regenerated)
    expect(tasks).toHaveLength(3);

    // All taskIds should be unique
    const taskIds = tasks.map((t) => t.taskId);
    const uniqueTaskIds = new Set(taskIds);
    expect(uniqueTaskIds.size).toBe(taskIds.length);

    // All instanceIds should be unique
    const instanceIds = tasks.map((t) => t.instanceId);
    const uniqueInstanceIds = new Set(instanceIds);
    expect(uniqueInstanceIds.size).toBe(instanceIds.length);
  });

  it('rejects duplicate instanceIds in persisted data and regenerates', () => {
    const duplicateData = {
      date: '2025-06-18',
      mapId: 'map.urban_wasteland',
      poolVersion: 'daily-tasks.v1',
      tasks: [
        makeInstance({ instanceId: 'same-id', taskId: 'daily_collect_waste' }),
        makeInstance({ instanceId: 'same-id', taskId: 'daily_restore_area' }),
        makeInstance({ instanceId: 'inst-3', taskId: 'daily_drainage_check' }),
      ],
    };
    localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(duplicateData));

    useDailyTaskStore.getState().init();
    const tasks = useDailyTaskStore.getState().tasks;

    expect(tasks).toHaveLength(3);

    const instanceIds = tasks.map((t) => t.instanceId);
    const uniqueInstanceIds = new Set(instanceIds);
    expect(uniqueInstanceIds.size).toBe(instanceIds.length);
  });

  it('regenerates when persisted data has fewer tasks than expected', () => {
    const shortData = {
      date: '2025-06-18',
      mapId: 'map.urban_wasteland',
      poolVersion: 'daily-tasks.v1',
      tasks: [
        makeInstance({ instanceId: 'inst-1', taskId: 'daily_collect_waste' }),
      ],
    };
    localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(shortData));

    useDailyTaskStore.getState().init();
    const tasks = useDailyTaskStore.getState().tasks;

    expect(tasks).toHaveLength(3);
  });

  it('emits DAILY_TASKS_GENERATED when regenerating from duplicate data', () => {
    const duplicateData = {
      date: '2025-06-18',
      mapId: 'map.urban_wasteland',
      poolVersion: 'daily-tasks.v1',
      tasks: [
        makeInstance({ instanceId: 'inst-1', taskId: 'daily_collect_waste' }),
        makeInstance({ instanceId: 'inst-2', taskId: 'daily_collect_waste' }),
      ],
    };
    localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(duplicateData));

    useDailyTaskStore.getState().init();

    expect(gameBridge.emit).toHaveBeenCalledWith(
      'DAILY_TASKS_GENERATED',
      expect.objectContaining({ tasks: expect.any(Array) }),
    );
  });

  it('keeps valid persisted data without duplicates', () => {
    // First init to generate valid data
    useDailyTaskStore.getState().init();
    const firstTasks = useDailyTaskStore.getState().tasks;

    // Reset store state but keep localStorage
    useDailyTaskStore.setState({ isInitialized: false, tasks: [] });

    // Re-init — should restore from localStorage
    useDailyTaskStore.getState().init();
    const restoredTasks = useDailyTaskStore.getState().tasks;

    expect(restoredTasks).toHaveLength(firstTasks.length);
    expect(restoredTasks.map((t) => t.taskId)).toEqual(firstTasks.map((t) => t.taskId));
  });
});
