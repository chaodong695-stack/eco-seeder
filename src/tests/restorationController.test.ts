import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { RestorationController } from '@/game/restoration/RestorationController';
import { POLLUTION_ZONE_01_TARGET } from '@/game/restoration/restorationDefinitions';
import type {
  RestorationStartedPayload,
  RestorationProgressPayload,
  RestorationInterruptedPayload,
  RestorationCompletedPayload,
  EnvironmentUpdatedPayload,
  VisualStageChangedPayload,
} from '@/game/restoration/restorationTypes';

const TASK_ID = 'task.urban_wasteland.pollution_cleanup_01';
const INTERACTION_ID = 'interaction.pollution_zone_01';

describe('RestorationController — Task Integration', () => {
  let controller: RestorationController;

  beforeEach(() => {
    useTaskStore.getState().resetTasks();
    useUIStore.getState().returnToStart();
    useEnvironmentStore.getState().resetEnvironment();
    gameBridge.clear();
    controller = new RestorationController(POLLUTION_ZONE_01_TARGET);
  });

  describe('cannot start without accepting task', () => {
    it('does not start when task is available (not accepted)', () => {
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('idle');
    });

    it('does not start when task is completed', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, INTERACTION_ID);
      useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');

      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('idle');
    });
  });

  describe('can start when task is active', () => {
    it('starts when task is active, E held, and in range', () => {
      useTaskStore.getState().acceptTask(TASK_ID);

      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('in_progress');
    });

    it('emits RESTORATION_STARTED event', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_STARTED', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationStartedPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
      expect(payload.interactionId).toBe(INTERACTION_ID);
      expect(payload.durationMs).toBe(3000);
    });

    it('sets input mode to restoration', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(useUIStore.getState().inputMode).toBe('restoration');
    });
  });

  describe('progress does not complete task prematurely', () => {
    it('task remains active during progress', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      // Update for 1 second (not enough to complete)
      for (let i = 0; i < 60; i++) {
        controller.update(16);
      }

      expect(controller.getStatus()).toBe('in_progress');
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('active');
    });
  });

  describe('interruption keeps task active', () => {
    it('task remains active when interrupted', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      // Release E key
      controller.setEKeyHeld(false);
      controller.update(16);

      expect(controller.getStatus()).toBe('interrupted');
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('active');
    });

    it('emits RESTORATION_INTERRUPTED event', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_INTERRUPTED', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as RestorationInterruptedPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
      expect(payload.interactionId).toBe(INTERACTION_ID);
    });

    it('restores input mode to gameplay on interrupt', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      controller.setEKeyHeld(false);
      controller.update(16);

      expect(useUIStore.getState().inputMode).toBe('gameplay');
    });
  });

  describe('completion triggers task objective completion', () => {
    it('transitions task to objective_completed when progress reaches 100%', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      // Update for 3+ seconds to complete
      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(controller.getStatus()).toBe('completed');
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('objective_completed');
    });

    it('emits RESTORATION_COMPLETED event exactly once', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_COMPLETED', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
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
      const payload = handler.mock.calls[0][0] as RestorationCompletedPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
    });

    it('emits TASK_OBJECTIVE_COMPLETED event', () => {
      const handler = vi.fn();
      gameBridge.on('TASK_OBJECTIVE_COMPLETED', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits ENVIRONMENT_UPDATED event', () => {
      const handler = vi.fn();
      gameBridge.on('ENVIRONMENT_UPDATED', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
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

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0] as VisualStageChangedPayload;
      expect(payload.stage).toBe('recovering');
    });

    it('does not duplicate task completion on repeated updates', () => {
      const handler = vi.fn();
      gameBridge.on('TASK_OBJECTIVE_COMPLETED', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 500; i++) {
        controller.update(16);
      }

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate environment effects', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      for (let i = 0; i < 500; i++) {
        controller.update(16);
      }

      const state = useEnvironmentStore.getState().state;
      // Effect should only be applied once
      expect(state.pollution).toBe(63);
      expect(state.restorationProgress).toBe(20);
    });
  });

  describe('resume from interrupted state', () => {
    it('resumes from saved progress', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
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

      // Progress should be at least as much as before interrupt
      expect(controller.getProgress()).toBeGreaterThanOrEqual(progressBeforeInterrupt);
    });
  });

  describe('progress events', () => {
    it('emits RESTORATION_PROGRESS with correct payload', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_PROGRESS', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      controller.update(500);

      expect(handler).toHaveBeenCalled();
      const payload = handler.mock.calls[0][0] as RestorationProgressPayload;
      expect(payload.targetId).toBe('restoration.pollution_zone_01');
      expect(payload.interactionId).toBe(INTERACTION_ID);
      expect(payload.progress).toBeGreaterThan(0);
      expect(payload.elapsedMs).toBeGreaterThan(0);
      expect(payload.durationMs).toBe(3000);
    });

    it('throttles progress events with minimum threshold', () => {
      const handler = vi.fn();
      gameBridge.on('RESTORATION_PROGRESS', handler);

      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);

      // Small deltas that don't exceed threshold
      controller.update(1);
      controller.update(1);

      // Should not emit for very small changes
      const callsAfterSmall = handler.mock.calls.length;

      // Larger delta
      controller.update(500);
      const callsAfterLarge = handler.mock.calls.length;

      expect(callsAfterLarge).toBeGreaterThan(callsAfterSmall);
    });
  });

  describe('forceInterrupt', () => {
    it('interrupts in_progress and resets key state', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getStatus()).toBe('in_progress');

      controller.forceInterrupt('场景销毁');

      expect(controller.getStatus()).toBe('interrupted');
      expect(useUIStore.getState().inputMode).toBe('gameplay');
    });
  });

  describe('getInteractionHint', () => {
    it('returns check hint when task not active', () => {
      expect(controller.getInteractionHint()).toBe('污染物堆 — 按 E 检查');
    });

    it('returns hold E hint when task is active', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      expect(controller.getInteractionHint()).toBe('污染物堆 — 按住 E 清理');
    });

    it('returns cleaning hint when in progress', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);

      expect(controller.getInteractionHint()).toBe('正在清理污染物堆');
    });

    it('returns paused hint when interrupted', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      controller.update(16);
      controller.setEKeyHeld(false);
      controller.update(16);

      expect(controller.getInteractionHint()).toBe('清理已暂停 — 按住 E 继续');
    });

    it('returns completed hint when completed', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      controller.setEKeyHeld(true);
      controller.setInRange(true);
      for (let i = 0; i < 200; i++) {
        controller.update(16);
      }

      expect(controller.getInteractionHint()).toBe('污染物堆 — 已完成临时清理');
    });
  });

  describe('syncCompleted', () => {
    it('syncs to completed when effect already applied', () => {
      // Simulate effect already applied (e.g., scene restore)
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
});
