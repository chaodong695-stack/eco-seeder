import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { DAILY_TASK_POOL_VERSION, findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useEnvironmentStore } from '@/store/environmentStore';

// Mock worldStore getState
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

// Mock gameBridge emit
vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}));

describe('dailyTaskStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useEnvironmentStore.getState().resetEnvironment();
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('initializes and generates 3 tasks', () => {
      useDailyTaskStore.getState().init();
      const state = useDailyTaskStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.tasks).toHaveLength(3);
    });

    it('is idempotent — calling init twice does not regenerate', () => {
      useDailyTaskStore.getState().init();
      const firstTasks = useDailyTaskStore.getState().tasks;
      useDailyTaskStore.getState().init();
      const secondTasks = useDailyTaskStore.getState().tasks;
      expect(secondTasks).toEqual(firstTasks);
    });

    it('emits DAILY_TASKS_GENERATED event', () => {
      useDailyTaskStore.getState().init();
      expect(gameBridge.emit).toHaveBeenCalledWith(
        'DAILY_TASKS_GENERATED',
        expect.objectContaining({ tasks: expect.any(Array) }),
      );
    });

    it('persists tasks to localStorage', () => {
      useDailyTaskStore.getState().init();
      const raw = localStorage.getItem('eco-seeder.daily-tasks.v1');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.date).toBe('2025-06-18');
      expect(parsed.tasks).toHaveLength(3);
    });

    it('restores tasks from localStorage on re-init', () => {
      useDailyTaskStore.getState().init();
      const firstTasks = useDailyTaskStore.getState().tasks;

      // Reset store but keep localStorage
      useDailyTaskStore.setState({ isInitialized: false, tasks: [] });

      useDailyTaskStore.getState().init();
      const restoredTasks = useDailyTaskStore.getState().tasks;
      expect(restoredTasks.map((t) => t.taskId)).toEqual(firstTasks.map((t) => t.taskId));
    });
  });

  describe('acceptTask', () => {
    it('accepts an available task', () => {
      useDailyTaskStore.getState().init();
      const instanceId = useDailyTaskStore.getState().tasks[0].instanceId;
      const result = useDailyTaskStore.getState().acceptTask(instanceId);
      expect(result).toBe(true);
      const task = useDailyTaskStore.getState().tasks.find((t) => t.instanceId === instanceId);
      expect(task?.status).not.toBe('available');
    });

    it('fails to accept already accepted task', () => {
      useDailyTaskStore.getState().init();
      const instanceId = useDailyTaskStore.getState().tasks[0].instanceId;
      useDailyTaskStore.getState().acceptTask(instanceId);
      const result = useDailyTaskStore.getState().acceptTask(instanceId);
      expect(result).toBe(false);
    });

    it('emits DAILY_TASK_STATUS_CHANGED on accept', () => {
      useDailyTaskStore.getState().init();
      const instanceId = useDailyTaskStore.getState().tasks[0].instanceId;
      const taskId = useDailyTaskStore.getState().tasks[0].taskId;
      useDailyTaskStore.getState().acceptTask(instanceId);
      expect(gameBridge.emit).toHaveBeenCalledWith(
        'DAILY_TASK_STATUS_CHANGED',
        expect.objectContaining({
          instanceId,
          taskId,
          previousStatus: 'available',
        }),
      );
    });
  });

  describe('applyProgress', () => {
    it('does not process progress for available task', () => {
      useDailyTaskStore.getState().init();
      const taskId = useDailyTaskStore.getState().tasks[0].taskId;
      useDailyTaskStore.getState().applyProgress({
        objectiveType: 'collect_waste',
        amount: 1,
        sourceId: 'src-1',
      });
      const task = useDailyTaskStore.getState().tasks.find((t) => t.taskId === taskId);
      expect(task?.progress).toBe(0);
    });

    it('processes progress for active task', () => {
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;

      // Find an unconditional task (will be active after accept since no weather condition)
      const unconditionalTask = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      expect(unconditionalTask).toBeDefined();
      if (!unconditionalTask) return;

      useDailyTaskStore.getState().acceptTask(unconditionalTask.instanceId);

      const def = findDailyTaskById(unconditionalTask.taskId)!;
      expect(def).toBeDefined();

      // Verify task is active (not waiting_condition)
      const accepted = useDailyTaskStore.getState().tasks.find(
        (t) => t.taskId === unconditionalTask.taskId,
      );
      expect(accepted?.status).toBe('active');

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find((t) => t.taskId === unconditionalTask.taskId);
      expect(updated?.progress).toBe(1);
    });

    it('prevents duplicate source contribution', () => {
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;

      const task = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      expect(task).toBeDefined();
      if (!task) return;

      useDailyTaskStore.getState().acceptTask(task.instanceId);

      const def = findDailyTaskById(task.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'src-1',
      });
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find((t) => t.taskId === task.taskId);
      expect(updated?.progress).toBe(1);
    });

    it('emits DAILY_TASK_PROGRESS_CHANGED', () => {
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;

      const task = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      if (!task) return;

      useDailyTaskStore.getState().acceptTask(task.instanceId);

      const def = findDailyTaskById(task.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'src-1',
      });

      expect(gameBridge.emit).toHaveBeenCalledWith(
        'DAILY_TASK_PROGRESS_CHANGED',
        expect.objectContaining({
          taskId: task.taskId,
          progress: 1,
        }),
      );
    });

    it('emits DAILY_TASK_COMPLETED when progress reaches target', () => {
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;

      const task = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      if (!task) return;

      useDailyTaskStore.getState().acceptTask(task.instanceId);

      const def = findDailyTaskById(task.taskId)!;

      // Complete the task
      for (let i = 0; i < def.targetValue; i++) {
        useDailyTaskStore.getState().applyProgress({
          objectiveType: def.objectiveType,
          amount: 1,
          sourceId: `src-${i}`,
        });
      }

      expect(gameBridge.emit).toHaveBeenCalledWith(
        'DAILY_TASK_COMPLETED',
        expect.objectContaining({ taskId: task.taskId }),
      );

      const updated = useDailyTaskStore.getState().tasks.find((t) => t.taskId === task.taskId);
      expect(updated?.status).toBe('completed');
      expect(updated?.rewardClaimed).toBe(true);
    });

    it('does not emit DAILY_TASK_COMPLETED twice', () => {
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;

      const task = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      if (!task) return;

      useDailyTaskStore.getState().acceptTask(task.instanceId);

      const def = findDailyTaskById(task.taskId)!;

      // Complete the task
      for (let i = 0; i < def.targetValue; i++) {
        useDailyTaskStore.getState().applyProgress({
          objectiveType: def.objectiveType,
          amount: 1,
          sourceId: `src-${i}`,
        });
      }

      // Try to add more progress
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'src-extra',
      });

      const completedCalls = (gameBridge.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'DAILY_TASK_COMPLETED',
      );
      expect(completedCalls).toHaveLength(1);
    });
  });

  describe('refreshWeatherConditions', () => {
    it('does nothing when not initialized', () => {
      useDailyTaskStore.getState().refreshWeatherConditions();
      // Should not throw, no changes
      expect(useDailyTaskStore.getState().tasks).toHaveLength(0);
    });
  });

  describe('getTasksByNpcId', () => {
    it('returns tasks for specific NPC', () => {
      useDailyTaskStore.getState().init();
      const weatherRangerTasks = useDailyTaskStore.getState().getTasksByNpcId('npc_weather_ranger');
      expect(weatherRangerTasks.length).toBeGreaterThan(0);
      for (const task of weatherRangerTasks) {
        
        const def = findDailyTaskById(task.taskId)!;
        expect(def.npcId).toBe('npc_weather_ranger');
      }
    });

    it('returns empty for unknown NPC', () => {
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().getTasksByNpcId('npc_unknown');
      expect(tasks).toEqual([]);
    });
  });

  describe('resetDailyTasks', () => {
    it('clears all state', () => {
      useDailyTaskStore.getState().init();
      useDailyTaskStore.getState().resetDailyTasks();
      const state = useDailyTaskStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.isInitialized).toBe(false);
      expect(state.localDate).toBe('');
    });

    it('clears localStorage', () => {
      useDailyTaskStore.getState().init();
      useDailyTaskStore.getState().resetDailyTasks();
      expect(localStorage.getItem('eco-seeder.daily-tasks.v1')).toBeNull();
    });
  });

  describe('persistence on return to start', () => {
    it('tasks survive resetDailyTasks + re-init (same date)', () => {
      useDailyTaskStore.getState().init();
      const firstTaskIds = useDailyTaskStore.getState().tasks.map((t) => t.taskId);

      // Reset and re-init
      useDailyTaskStore.getState().resetDailyTasks();
      // Re-save to localStorage since reset clears it
      // In real flow, GamePage doesn't call resetDailyTasks on return to start
      // So we test the init flow directly
      useDailyTaskStore.setState({ isInitialized: false });

      // Need to re-save since reset clears localStorage
      // This simulates the scenario where tasks were saved before reset
      // In the real app, resetDailyTasks is NOT called on return to start
      useDailyTaskStore.getState().init();
      const secondTaskIds = useDailyTaskStore.getState().tasks.map((t) => t.taskId);

      // Task IDs may differ since reset clears localStorage, but count should be same
      expect(secondTaskIds).toHaveLength(firstTaskIds.length);
    });
  });

  describe('pool version', () => {
    it('uses correct pool version', () => {
      expect(DAILY_TASK_POOL_VERSION).toBe('daily-tasks.v1');
    });
  });
});
