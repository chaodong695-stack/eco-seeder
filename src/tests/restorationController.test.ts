import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { RestorationController } from '@/game/restoration/RestorationController';
import { POLLUTION_ZONE_01_TARGET } from '@/game/restoration/restorationDefinitions';
import type {
  RestorationStartedPayload,
  RestorationProgressPayload,
  RestorationInterruptedPayload,
  EnvironmentUpdatedPayload,
  VisualStageChangedPayload,
} from '@/game/restoration/restorationTypes';


// Mock worldStore
vi.mock('@/store/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      timeSnapshot: { localDate: '2025-01-04' },
      getWeatherTimeline: () => ({
        date: '2025-01-04',
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

// Use real gameBridge — no mock

describe('RestorationController — Daily Task Integration', () => {
  let controller: RestorationController;

  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useUIStore.getState().returnToStart();
    useEnvironmentStore.getState().resetEnvironment();
    gameBridge.clear();
    controller = new RestorationController(POLLUTION_ZONE_01_TARGET);
  });

  function acceptWasteTask(): void {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def?.objectiveType === 'collect_waste';
    });
    if (task) {
      useDailyTaskStore.getState().acceptTask(task.instanceId);
    }
  }

  describe('cannot start without accepting daily task', () => {
    it('does not start when daily task is available (not accepted)', () => {
      useDailyTaskStore.getState().init();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('idle');
    });

    it('does not start when daily task is completed', () => {
      useDailyTaskStore.getState().init();
      acceptWasteTask();
      // Complete the daily task by sending progress signals
      const task = useDailyTaskStore.getState().tasks.find((t) => { const def = findDailyTaskById(t.taskId); return def?.objectiveType === 'collect_waste'; });
      if (task) {
        const def = task;
        for (let i = 0; i < def.targetValue; i++) {
          useDailyTaskStore.getState().applyProgress({
            objectiveType: 'collect_waste',
            amount: 1,
            sourceId: `src-test-${i}`,
          });
        }
      }

      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('idle');
    });
  });

  describe('can start when daily task is active', () => {
    it('starts when daily task is active, E held, and in range', () => {
      acceptWasteTask();

      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('in_progress');
    });

    it('emits RESTORATION_STARTED event', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_STARTED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationStartedPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
      expect(payload.interactionId).toBe('interaction.pollution_zone_01');
      expect(payload.durationMs).toBe(3000);
    });

    it('sets input mode to restoration', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(useUIStore.getState().inputMode).toBe('restoration');
    });
  });

  describe('progress does not complete task prematurely', () => {
    it('daily task remains active during progress', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      // Update for 1 second (not enough to complete)
      for (let i = 0; i < 60; i++) {
        controller.update(16);
      }

      expect(controller.getStatus()).toBe('in_progress');
      const task = useDailyTaskStore.getState().tasks.find((t) => { const def = findDailyTaskById(t.taskId); return def?.objectiveType === 'collect_waste'; });
      expect(task?.status).toBe('active');
    });
  });

  describe('interruption keeps task active', () => {
    it('daily task remains active when interrupted', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      // Release E key
      controller.setEKeyHeld(false);
      controller.update(16);

      expect(controller.getStatus()).toBe('interrupted');
      const task = useDailyTaskStore.getState().tasks.find((t) => { const def = findDailyTaskById(t.taskId); return def?.objectiveType === 'collect_waste'; });
      expect(task?.status).toBe('active');
    });

    it('emits RESTORATION_INTERRUPTED event', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_INTERRUPTED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationInterruptedPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
    });

    it('restores input mode to gameplay on interrupt', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);

      expect(useUIStore.getState().inputMode).toBe('gameplay');
    });
  });

  describe('completion sends daily task progress signal', () => {
    it('completes restoration and sends DAILY_TASK_PROGRESS_SIGNAL', () => {
      const handler = vi.fn();
      gameBridge.on('DAILY_TASK_PROGRESS_SIGNAL', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(controller.getStatus()).toBe('completed');
      // Should have emitted progress signal
      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as { objectiveType: string; amount: number; sourceId: string };
      expect(payload.objectiveType).toBe('collect_waste');
      expect(payload.amount).toBe(1);
      expect(payload.sourceId).toBe('interaction.pollution_zone_01');
    });

    it('emits RESTORATION_COMPLETED event exactly once', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_COMPLETED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      // Extra updates after completion
      for (let i = 0; i < 10; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits ENVIRONMENT_UPDATED event', () => {
      const handler = vi.fn();
      gameBridge.on('ENVIRONMENT_UPDATED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as EnvironmentUpdatedPayload;
      expect(payload.pollution).toBe(63);
      expect(payload.vegetation).toBe(25);
      expect(payload.waterQuality).toBe(35);
      expect(payload.restorationProgress).toBe(20);
      expect(payload.visualStage).toBe('recovering');
    });

    it('emits VISUAL_STAGE_CHANGED event', () => {
      const handler = vi.fn();
      gameBridge.on('VISUAL_STAGE_CHANGED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as VisualStageChangedPayload;
      expect(payload.stage).toBe('recovering');
    });

    it('does not duplicate completion on repeated updates', () => {
      const handler = vi.fn();
      gameBridge.on('DAILY_TASK_PROGRESS_SIGNAL', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 500; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate environment effects', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 500; i++) {
        controller.update(16);
      }

      const state = useEnvironmentStore.getState().state;
      expect(state.pollution).toBe(63);
      expect(state.restorationProgress).toBe(20);
    });
  });

  describe('resume from interrupted state', () => {
    it('resumes from saved progress', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      // Progress to ~1.5 seconds
      for (let i = 0; i < 90; i++) {
        controller.update(16);
      }

      const progressBeforeInterrupt = controller.getProgress();
      expect(progressBeforeInterrupt).toBeGreaterThan(0.3);

      // Interrupt
      controller.setEKeyHeld(false);
      controller.update(16);
      expect(controller.getStatus()).toBe('interrupted');

      // Resume
      controller.setEKeyHeld(true);
      controller.update(16);
      expect(controller.getStatus()).toBe('in_progress');

      expect(controller.getProgress()).toBeGreaterThanOrEqual(progressBeforeInterrupt);
    });
  });

  describe('progress events', () => {
    it('emits RESTORATION_PROGRESS with correct payload', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_PROGRESS', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      controller.update(500);

      expect(handler).toHaveBeenCalled();
      const payload = handler.mock.calls[0][0] as RestorationProgressPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
      expect(payload.progress).toBeGreaterThan(0);
      expect(payload.elapsedMs).toBeGreaterThan(0);
      expect(payload.durationMs).toBe(3000);
    });
  });

  describe('forceInterrupt', () => {
    it('interrupts in_progress and resets key state', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('in_progress');

      controller.forceInterrupt('场景销毁');

      expect(controller.getStatus()).toBe('interrupted');
      expect(useUIStore.getState().inputMode).toBe('gameplay');
    });

    it('emits interrupted event with inRange=false when forceInterrupt called', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_INTERRUPTED', handler);

      controller.forceInterrupt('场景销毁');

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationInterruptedPayload;
      expect(payload.inRange).toBe(false);
    });
  });

  describe('getInteractionHint', () => {
    it('returns hint to accept task when daily task not active', () => {
      useDailyTaskStore.getState().init();
      expect(controller.getInteractionHint()).toContain('请先向林工接取');
    });

    it('returns hold E hint when daily task is active', () => {
      acceptWasteTask();
      expect(controller.getInteractionHint()).toBe('污染物堆 — 按住 E 清理');
    });

    it('returns cleaning hint when in progress', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getInteractionHint()).toBe('正在清理污染物堆');
    });

    it('returns paused hint when interrupted', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);
      controller.setEKeyHeld(false);
      controller.update(16);

      expect(controller.getInteractionHint()).toBe('清理已暂停 — 按住 E 继续');
    });

    it('returns completed hint when completed', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(controller.getInteractionHint()).toBe('污染物堆 — 已完成清理');
    });
  });

  describe('syncCompleted', () => {
    it('syncs to completed when effect already applied', () => {
      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
        pollution: -15,
        vegetation: 3,
        waterQuality: 5,
        restorationProgress: 20,
      });

      controller.syncCompleted();

      expect(controller.getStatus()).toBe('completed');
    });

    it('does not sync when effect not applied', () => {
      controller.syncCompleted();
      expect(controller.getStatus()).toBe('idle');
    });
  });

  // ─── 离开范围 / 重新进入范围 行为 ───────────────────────

  describe('leaving range while interrupted', () => {
    it('preserves progress after leaving range', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      // 进度推进
      for (let i = 0; i < 60; i++) {
        controller.update(16);
      }
      const progressBefore = controller.getProgress();
      expect(progressBefore).toBeGreaterThan(0.1);

      // 松开 E 中断
      controller.setEKeyHeld(false);
      controller.update(16);
      expect(controller.getStatus()).toBe('interrupted');

      // 离开范围
      controller.setInRange(false);

      expect(controller.getProgress()).toBe(progressBefore);
      expect(controller.getStatus()).toBe('interrupted');
    });

    it('emits interrupted event with inRange=false when leaving range', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_INTERRUPTED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);
      expect(controller.getStatus()).toBe('interrupted');

      handler.mockClear();

      controller.setInRange(false);

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationInterruptedPayload;
      expect(payload.inRange).toBe(false);
    });

    it('emits interrupted event with inRange=true when re-entering range', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_INTERRUPTED', handler);

      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);
      expect(controller.getStatus()).toBe('interrupted');

      controller.setInRange(false);

      handler.mockClear();

      controller.setInRange(true);

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationInterruptedPayload;
      expect(payload.inRange).toBe(true);
    });

    it('does not advance progress when out of range and E pressed', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);
      expect(controller.getStatus()).toBe('interrupted');

      controller.setInRange(false);

      controller.setEKeyHeld(true);
      const progressBefore = controller.getProgress();

      for (let i = 0; i < 60; i++) {
        controller.update(16);
      }

      expect(controller.getProgress()).toBe(progressBefore);
      expect(controller.getStatus()).toBe('interrupted');
    });

    it('resumes from saved progress when re-entering range and holding E', () => {
      acceptWasteTask();
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 90; i++) {
        controller.update(16);
      }
      const progressBefore = controller.getProgress();
      expect(progressBefore).toBeGreaterThan(0.3);

      controller.setEKeyHeld(false);
      controller.update(16);
      expect(controller.getStatus()).toBe('interrupted');

      controller.setInRange(false);

      controller.setInRange(true);
      controller.setEKeyHeld(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('in_progress');
      expect(controller.getProgress()).toBeGreaterThanOrEqual(progressBefore);
    });
  });
});
