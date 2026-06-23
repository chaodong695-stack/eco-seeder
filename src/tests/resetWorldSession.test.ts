/**
 * DEV-06 第五轮修复测试 — resetWorldSession 统一世界状态重置。
 *
 * 覆盖 Issue #16 第 8 节要求的测试：
 * 1. resetWorldSession 会重置每日任务状态；
 * 2. resetWorldSession 会重置区域修复状态；
 * 3. resetWorldSession 会重置污染物堆完成状态；
 * 4. resetWorldSession 会清空 completed sourceId；
 * 5. 角色重新选择后不继承上一局区域修复进度；
 * 6. 角色重新选择后不继承上一局污染物完成状态；
 * 7. 角色重新选择后任务状态为初始状态；
 * 8. 任务内容允许不同，但任务状态不能继承；
 * 9. Scene create/destroy/create 后不读取旧对象完成状态；
 * 10. 旧任务系统不会重新注入已完成状态。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetWorldSession } from '@/game/session/resetWorldSession';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useEnvironmentStore, INITIAL_ENVIRONMENT_STATE } from '@/store/environmentStore';
import { useTaskStore } from '@/store/taskStore';
import { DAILY_TASKS_STORAGE_KEY } from '@/domain/tasks/dailyTaskPersistence';
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
let mockCharacter: { characterId: string; gender: 'male' | 'female'; displayName: string } | null =
  { characterId: 'character.player_male', gender: 'male', displayName: '男性生态修复员' };

vi.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      character: mockCharacter,
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
  mockCharacter = {
    characterId: 'character.player_male',
    gender: 'male',
    displayName: '男性生态修复员',
  };
}

describe('DEV-06 Round 5: resetWorldSession — unified world state reset', () => {
  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useEnvironmentStore.getState().resetEnvironment();
    useTaskStore.getState().resetTasks();
    resetMocks();
    vi.clearAllMocks();
  });

  // Test 1: resetWorldSession 会重置每日任务状态
  it('1. resets daily task state', () => {
    // Initialize and accept/complete tasks
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks[0];
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    // Verify tasks exist
    expect(useDailyTaskStore.getState().tasks).toHaveLength(3);
    expect(useDailyTaskStore.getState().isInitialized).toBe(true);

    // Reset
    resetWorldSession();

    // All task state should be reset
    expect(useDailyTaskStore.getState().tasks).toHaveLength(0);
    expect(useDailyTaskStore.getState().isInitialized).toBe(false);
    expect(useDailyTaskStore.getState().contributedSources.size).toBe(0);
    expect(useDailyTaskStore.getState().localDate).toBe('');
    expect(useDailyTaskStore.getState().selectedCharacterId).toBe('');
  });

  // Test 2: resetWorldSession 会重置区域修复状态
  it('2. resets environment restoration state', () => {
    // Apply some environment effects (simulating completing a pollution cleanup)
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(20);
    expect(useEnvironmentStore.getState().visualStage).toBe('recovering');

    // Reset
    resetWorldSession();

    // Environment should be back to initial state
    const state = useEnvironmentStore.getState().state;
    expect(state).toEqual(INITIAL_ENVIRONMENT_STATE);
    expect(state.restorationProgress).toBe(0);
    expect(useEnvironmentStore.getState().visualStage).toBe('polluted');
  });

  // Test 3: resetWorldSession 会重置污染物堆完成状态
  it('3. resets pollution zone completed state', () => {
    // Simulate pollution zone cleanup completion
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    // Verify the effect was applied
    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(true);

    // Reset
    resetWorldSession();

    // The pollution zone should no longer be marked as completed
    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(false);
    expect(useEnvironmentStore.getState().appliedTargetIds.size).toBe(0);
  });

  // Test 4: resetWorldSession 会清空 completed sourceId
  it('4. clears completed sourceIds', () => {
    // Initialize daily tasks and add progress with sourceIds
    useDailyTaskStore.getState().init();

    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);
    const def = findDailyTaskById(task.taskId)!;

    // Add progress with sourceIds
    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `waste-pile-${i}`,
      });
    }

    // Verify sourceIds were recorded
    expect(useDailyTaskStore.getState().contributedSources.has('waste-pile-0')).toBe(true);

    // Reset
    resetWorldSession();

    // All sourceIds should be cleared
    expect(useDailyTaskStore.getState().contributedSources.size).toBe(0);
    expect(useDailyTaskStore.getState().contributedSources.has('waste-pile-0')).toBe(false);
  });

  // Test 5: 角色重新选择后不继承上一局区域修复进度
  it('5. character re-select does not inherit previous restoration progress', () => {
    // Simulate first playthrough — complete pollution cleanup
    useDailyTaskStore.getState().init();
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 41,
    });

    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(41);

    // Simulate returning to start page and selecting a new character
    // resetWorldSession is called in CharacterSelectPage.handleConfirm
    resetWorldSession();

    // Simulate new character entering game — Scene create calls init
    mockCharacter = {
      characterId: 'character.player_female',
      gender: 'female',
      displayName: '女性生态修复员',
    };
    useDailyTaskStore.getState().init();

    // Environment should NOT have restoration progress from previous playthrough
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(0);
    expect(useEnvironmentStore.getState().state.pollution).toBe(INITIAL_ENVIRONMENT_STATE.pollution);
  });

  // Test 6: 角色重新选择后不继承上一局污染物完成状态
  it('6. character re-select does not inherit previous pollution zone completion', () => {
    // Simulate first playthrough — complete pollution cleanup
    useDailyTaskStore.getState().init();
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    // Verify pollution zone is marked as completed
    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(true);

    // Simulate returning to start page and selecting a new character
    resetWorldSession();

    // Simulate new character entering game
    mockCharacter = {
      characterId: 'character.player_female',
      gender: 'female',
      displayName: '女性生态修复员',
    };
    useDailyTaskStore.getState().init();

    // Pollution zone should NOT be marked as completed
    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(false);
  });

  // Test 7: 角色重新选择后任务状态为初始状态
  it('7. character re-select results in initial task state', () => {
    // Simulate first playthrough — accept and complete tasks
    useDailyTaskStore.getState().init();

    // Find an unconditional task (no weather condition) so it can be completed
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);
    const def = findDailyTaskById(task.taskId)!;

    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `src-${i}`,
      });
    }

    // Verify task is completed
    const completedTask = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    );
    expect(completedTask!.status).toBe('completed');

    // Simulate new character entering game
    resetWorldSession();
    mockCharacter = {
      characterId: 'character.player_female',
      gender: 'female',
      displayName: '女性生态修复员',
    };
    useDailyTaskStore.getState().init();

    // All tasks should be in initial state (available, progress 0)
    const newTasks = useDailyTaskStore.getState().tasks;
    expect(newTasks).toHaveLength(3);
    for (const t of newTasks) {
      expect(t.status).toBe('available');
      expect(t.progress).toBe(0);
      expect(t.rewardClaimed).toBe(false);
    }
  });

  // Test 8: 任务内容允许不同，但任务状态不能继承
  it('8. task content may differ but task state must not carry over', () => {
    // First playthrough with male character
    useDailyTaskStore.getState().init();
    const maleTasks = useDailyTaskStore.getState().tasks;

    // Accept and complete a task
    const task = maleTasks[0];
    useDailyTaskStore.getState().acceptTask(task.instanceId);
    const def = findDailyTaskById(task.taskId)!;
    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `male-src-${i}`,
      });
    }

    // Reset for new playthrough
    resetWorldSession();

    // Second playthrough with female character
    mockCharacter = {
      characterId: 'character.player_female',
      gender: 'female',
      displayName: '女性生态修复员',
    };
    useDailyTaskStore.getState().init();
    const femaleTasks = useDailyTaskStore.getState().tasks;

    // Task list may differ (random tasks), but all must be in initial state
    expect(femaleTasks).toHaveLength(3);
    for (const t of femaleTasks) {
      expect(t.status).toBe('available');
      expect(t.progress).toBe(0);
      expect(t.rewardClaimed).toBe(false);
    }

    // Task IDs may or may not be the same (acceptable per product rules)
    // but state must NOT be completed/active
    const maleCompletedTaskIds = maleTasks
      .filter((t) => t.status === 'completed')
      .map((t) => t.taskId);
    for (const t of femaleTasks) {
      if (maleCompletedTaskIds.includes(t.taskId)) {
        // Even if the same task ID appears, it must be in initial state
        expect(t.status).toBe('available');
        expect(t.progress).toBe(0);
      }
    }
  });

  // Test 9: Scene create/destroy/create 后不读取旧对象完成状态
  it('9. after create/destroy/create cycle, does not read old object completion state', () => {
    // Simulate Scene create — init stores
    useDailyTaskStore.getState().init();

    // Simulate completing pollution zone cleanup
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(true);

    // Simulate Scene destroy (handleSceneCleanup calls resetWorld)
    // Then simulate returning to start page (resetWorldSession called)
    resetWorldSession();

    // Simulate Scene create again (new playthrough)
    useDailyTaskStore.getState().init();

    // The environment store should NOT have old completion state
    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(false);
    expect(useEnvironmentStore.getState().appliedTargetIds.size).toBe(0);
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(0);
  });

  // Test 10: 旧任务系统不会重新注入已完成状态
  it('10. old task system does not re-inject completed state', () => {
    // Simulate old task system having completed state
    const oldTaskId = 'task.urban_wasteland.pollution_cleanup_01';
    useTaskStore.getState().acceptTask(oldTaskId);
    useTaskStore.getState().completeObjective(oldTaskId, 'interaction.pollution_zone_01');
    useTaskStore.getState().submitTask(oldTaskId, 'npc.engineer.lin');

    // Verify old task is completed
    expect(useTaskStore.getState().getTaskStatus(oldTaskId)).toBe('completed');
    expect(useTaskStore.getState().isRewardClaimed(oldTaskId)).toBe(true);

    // Reset world session
    resetWorldSession();

    // Old task system should be reset to available
    expect(useTaskStore.getState().getTaskStatus(oldTaskId)).toBe('available');
    expect(useTaskStore.getState().isRewardClaimed(oldTaskId)).toBe(false);
  });

  // Additional: resetWorldSession clears localStorage for daily tasks
  it('clears daily tasks localStorage on reset', () => {
    useDailyTaskStore.getState().init();

    // Verify localStorage has data
    expect(localStorage.getItem(DAILY_TASKS_STORAGE_KEY)).not.toBeNull();

    resetWorldSession();

    // localStorage should be cleared
    expect(localStorage.getItem(DAILY_TASKS_STORAGE_KEY)).toBeNull();
  });

  // Additional: resetWorldSession clears localStorage for environment
  it('clears environment localStorage on reset', () => {
    useEnvironmentStore.getState().applyEffect('test-target', {
      pollution: -10,
      vegetation: 5,
      waterQuality: 3,
      restorationProgress: 15,
    });

    // Verify localStorage has data
    expect(localStorage.getItem('eco-seeder.environment.v1')).not.toBeNull();

    resetWorldSession();

    // localStorage should be cleared
    expect(localStorage.getItem('eco-seeder.environment.v1')).toBeNull();
  });

  // Additional: resetWorldSession is idempotent
  it('is idempotent — multiple calls do not cause errors', () => {
    useDailyTaskStore.getState().init();
    useEnvironmentStore.getState().applyEffect('test-target', {
      pollution: -10,
      vegetation: 5,
      waterQuality: 3,
      restorationProgress: 15,
    });

    // Multiple resets should not throw
    expect(() => {
      resetWorldSession();
      resetWorldSession();
      resetWorldSession();
    }).not.toThrow();

    // State should still be in initial state
    expect(useDailyTaskStore.getState().tasks).toHaveLength(0);
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(0);
  });

  // Additional: resetWorldSession clears reward-related sourceIds
  it('clears reward-related sourceIds (reward.* prefix)', () => {
    useDailyTaskStore.getState().init();

    // Simulate task completion which applies reward
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather && def.reward?.restorationValue;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);
    const def = findDailyTaskById(task.taskId)!;
    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `reward-src-${i}`,
      });
    }

    // Verify reward was applied
    const rewardTargetId = `reward.${task.taskId}`;
    expect(useEnvironmentStore.getState().isEffectApplied(rewardTargetId)).toBe(true);

    // Reset
    resetWorldSession();

    // Reward effect should be cleared
    expect(useEnvironmentStore.getState().isEffectApplied(rewardTargetId)).toBe(false);
  });

  // Additional: page refresh scenario — environment store loads from localStorage
  // but resetWorldSession clears it
  it('simulates page refresh: environment loads from localStorage then reset clears it', () => {
    // Simulate first playthrough — write to localStorage
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 41,
    });

    // Simulate page refresh — environment store would load from localStorage
    // (In real code, the store initializes from localStorage on module load)
    // We simulate this by checking localStorage has the data
    expect(localStorage.getItem('eco-seeder.environment.v1')).not.toBeNull();

    // Now simulate entering character select page and confirming
    // resetWorldSession is called
    resetWorldSession();

    // Environment should be in initial state
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(0);
    expect(useEnvironmentStore.getState().state.pollution).toBe(INITIAL_ENVIRONMENT_STATE.pollution);
    expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(false);

    // localStorage should also be cleared
    expect(localStorage.getItem('eco-seeder.environment.v1')).toBeNull();
  });
});
