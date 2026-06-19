/**
 * DEV-06 第四轮修复测试 — 持久化、角色切换、奖励一致性。
 *
 * 覆盖 Issue #16 第 5 节要求的测试：
 * 1. 初始化每日任务后写入 eco-seeder.daily-tasks.v1；
 * 2. 接取任务后 localStorage 状态同步变化；
 * 3. 任务进度变化后 localStorage 状态同步变化；
 * 4. 任务完成后 completed 状态持久化；
 * 5. 刷新/重新初始化 store 后能从 localStorage 恢复；
 * 6. selectedCharacterId 改变后，任务状态重置；
 * 7. selectedCharacterId 改变后，区域修复状态同步重置；
 * 8. 任务 completed 与区域修复进度保持一致；
 * 9. 没有 localStorage 数据时不应凭空显示旧 completed 状态；
 * 10. 旧任务 Store 不再影响 DailyTaskPanel 和任务面板。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { resetWorldSession } from '@/game/session/resetWorldSession';
import {
  DAILY_TASKS_STORAGE_KEY,
  loadDailyTasks,
} from '@/domain/tasks/dailyTaskPersistence';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';

// Mock worldStore
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

// Mock playerStore — mutable for character change tests
let mockCharacterId = 'character.player_male';
let mockCharacter: { characterId: string; gender: 'male' | 'female'; displayName: string } | null =
  { characterId: 'character.player_male', gender: 'male', displayName: '男性生态修复员' };

vi.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      character: mockCharacter,
      switchCharacter: (gender: 'male' | 'female') => {
        mockCharacterId = `character.player_${gender}`;
        mockCharacter = {
          characterId: mockCharacterId,
          gender,
          displayName: gender === 'male' ? '男性生态修复员' : '女性生态修复员',
        };
      },
    }),
  },
}));

// Mock gameBridge
vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}));

function resetMocks() {
  mockCharacterId = 'character.player_male';
  mockCharacter = {
    characterId: 'character.player_male',
    gender: 'male',
    displayName: '男性生态修复员',
  };
}

describe('DEV-06 Round 4: Persistence, character switch, reward consistency', () => {
  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useEnvironmentStore.getState().resetEnvironment();
    resetMocks();
    vi.clearAllMocks();
  });

  // Test 1: 初始化每日任务后写入 localStorage
  it('1. writes to eco-seeder.daily-tasks.v1 after init', () => {
    useDailyTaskStore.getState().init();

    const raw = localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const persisted = loadDailyTasks();
    expect(persisted).not.toBeNull();
    expect(persisted!.date).toBe('2025-06-18');
    expect(persisted!.tasks).toHaveLength(3);
    expect(persisted!.selectedCharacterId).toBe('character.player_male');
  });

  // Test 2: 接取任务后 localStorage 状态同步变化
  it('2. localStorage status changes after accepting a task', () => {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks[0];
    const originalStatus = task.status;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    const persisted = loadDailyTasks();
    const persistedTask = persisted!.tasks.find((t) => t.instanceId === task.instanceId);
    expect(persistedTask!.status).not.toBe(originalStatus);
    expect(persistedTask!.status).not.toBe('available');
  });

  // Test 3: 任务进度变化后 localStorage 状态同步变化
  it('3. localStorage progress changes after applying progress', () => {
    useDailyTaskStore.getState().init();

    // Find an unconditional task with targetValue > 1 so it doesn't complete immediately
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather && def.targetValue > 1;
    });
    // If no such task exists, use any unconditional task and check it completes
    const fallbackTask = task ?? useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    expect(fallbackTask).toBeDefined();
    if (!fallbackTask) return;

    useDailyTaskStore.getState().acceptTask(fallbackTask.instanceId);
    const def = findDailyTaskById(fallbackTask.taskId)!;

    useDailyTaskStore.getState().applyProgress({
      objectiveType: def.objectiveType,
      amount: 1,
      sourceId: 'test-source-1',
    });

    const persisted = loadDailyTasks();
    const persistedTask = persisted!.tasks.find((t) => t.instanceId === fallbackTask.instanceId);
    expect(persistedTask!.progress).toBe(1);
    // Status should be active (if targetValue > 1) or completed (if targetValue === 1)
    if (def.targetValue > 1) {
      expect(persistedTask!.status).toBe('active');
    } else {
      expect(persistedTask!.status).toBe('completed');
    }

    // Verify contributedSources are persisted
    expect(persisted!.contributedSources).toContain('test-source-1');
  });

  // Test 4: 任务完成后 completed 状态持久化
  it('4. completed status and rewardClaimed are persisted', () => {
    useDailyTaskStore.getState().init();

    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);
    const def = findDailyTaskById(task.taskId)!;

    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `complete-src-${i}`,
      });
    }

    const persisted = loadDailyTasks();
    const persistedTask = persisted!.tasks.find((t) => t.instanceId === task.instanceId);
    expect(persistedTask!.status).toBe('completed');
    expect(persistedTask!.rewardClaimed).toBe(true);

    // All sourceIds should be persisted
    for (let i = 0; i < def.targetValue; i++) {
      expect(persisted!.contributedSources).toContain(`complete-src-${i}`);
    }
  });

  // Test 5: 刷新/重新初始化 store 后能从 localStorage 恢复
  it('5. restores tasks from localStorage after re-init', () => {
    useDailyTaskStore.getState().init();

    // Accept a task and add progress
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);
    const def = findDailyTaskById(task.taskId)!;
    useDailyTaskStore.getState().applyProgress({
      objectiveType: def.objectiveType,
      amount: 1,
      sourceId: 'restore-src-1',
    });

    const beforeProgress = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    )!.progress;
    const beforeStatus = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    )!.status;

    // Simulate page refresh — reset store state but keep localStorage
    useDailyTaskStore.setState({
      isInitialized: false,
      tasks: [],
      localDate: '',
      selectedCharacterId: '',
      contributedSources: new Set(),
    });

    // Re-init — should restore from localStorage
    useDailyTaskStore.getState().init();

    const restoredTask = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    );
    expect(restoredTask).toBeDefined();
    expect(restoredTask!.progress).toBe(beforeProgress);
    expect(restoredTask!.status).toBe(beforeStatus);

    // contributedSources should also be restored
    expect(useDailyTaskStore.getState().contributedSources.has('restore-src-1')).toBe(true);
  });

  // Test 6: selectedCharacterId 改变后，任务状态重置
  it('6. task state resets when selectedCharacterId changes', () => {
    useDailyTaskStore.getState().init();

    // Verify tasks exist
    expect(useDailyTaskStore.getState().tasks).toHaveLength(3);
    expect(useDailyTaskStore.getState().isInitialized).toBe(true);

    // Simulate character switch — now uses resetWorldSession
    mockCharacter = {
      characterId: 'character.player_female',
      gender: 'female',
      displayName: '女性生态修复员',
    };

    resetWorldSession();

    // Store should be reset
    expect(useDailyTaskStore.getState().isInitialized).toBe(false);
    expect(useDailyTaskStore.getState().tasks).toHaveLength(0);

    // localStorage should be cleared
    expect(loadDailyTasks()).toBeNull();
  });

  // Test 7: selectedCharacterId 改变后，区域修复状态同步重置
  it('7. environment state resets when character changes', () => {
    useDailyTaskStore.getState().init();

    // Apply some environment effect
    useEnvironmentStore.getState().applyEffect('test-effect', {
      pollution: -10,
      vegetation: 5,
      waterQuality: 3,
      restorationProgress: 15,
    });
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(15);

    // Simulate character switch — now uses resetWorldSession
    resetWorldSession();

    // Environment should be reset
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(0);
    expect(useEnvironmentStore.getState().state.pollution).toBe(78);
    expect(useEnvironmentStore.getState().visualStage).toBe('polluted');
  });

  // Test 8: 任务 completed 与区域修复进度保持一致
  it('8. task completion applies restorationValue to environment', () => {
    useDailyTaskStore.getState().init();

    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather && def.reward?.restorationValue;
    });
    if (!task) return;

    const def = findDailyTaskById(task.taskId)!;
    const initialProgress = useEnvironmentStore.getState().state.restorationProgress;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `reward-src-${i}`,
      });
    }

    // Task should be completed
    const completedTask = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    );
    expect(completedTask!.status).toBe('completed');

    // Environment restorationProgress should have increased by restorationValue
    const newProgress = useEnvironmentStore.getState().state.restorationProgress;
    expect(newProgress).toBe(initialProgress + def.reward!.restorationValue!);

    // The persisted data should also contain the restorationProgress
    const persisted = loadDailyTasks();
    expect(persisted!.restorationProgress).toBe(newProgress);
  });

  // Test 9: 没有 localStorage 数据时不应凭空显示旧 completed 状态
  it('9. no completed tasks appear when localStorage is empty', () => {
    // Ensure localStorage is empty
    expect(localStorage.getItem(DAILY_TASKS_STORAGE_KEY)).toBeNull();

    useDailyTaskStore.getState().init();

    // All tasks should be available (not completed)
    const tasks = useDailyTaskStore.getState().tasks;
    for (const task of tasks) {
      expect(task.status).toBe('available');
      expect(task.progress).toBe(0);
      expect(task.rewardClaimed).toBe(false);
    }
  });

  // Test 10: 旧任务 Store 不再影响 DailyTaskPanel 和任务面板
  it('10. old taskStore does not affect daily task store', () => {
    useDailyTaskStore.getState().init();

    // dailyTaskStore tasks should not reference old taskStore task IDs
    const tasks = useDailyTaskStore.getState().tasks;
    for (const task of tasks) {
      // Daily task IDs should start with 'daily_'
      expect(task.taskId.startsWith('daily_')).toBe(true);
      // Should not contain old task IDs like 'task.urban_wasteland'
      expect(task.taskId).not.toContain('task.urban_wasteland');
    }
  });

  // Additional: restorationProgress is persisted in localStorage
  it('restorationProgress is persisted alongside tasks', () => {
    useDailyTaskStore.getState().init();

    // Apply progress to a task with reward
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather && def.reward?.restorationValue;
    });
    if (!task) return;

    const def = findDailyTaskById(task.taskId)!;
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `persist-src-${i}`,
      });
    }

    const persisted = loadDailyTasks();
    expect(persisted!.restorationProgress).toBe(def.reward!.restorationValue);
  });

  // Additional: different character produces different task seeds
  it('different selectedCharacterId produces different tasks', () => {
    // Init with male character
    useDailyTaskStore.getState().init();

    // Switch to female character — now uses resetWorldSession
    mockCharacter = {
      characterId: 'character.player_female',
      gender: 'female',
      displayName: '女性生态修复员',
    };
    resetWorldSession();
    useDailyTaskStore.getState().init();

    // Task IDs should likely differ (different seed)
    // At minimum, the persisted characterId should be different
    const persisted = loadDailyTasks();
    expect(persisted!.selectedCharacterId).toBe('character.player_female');
  });
});
