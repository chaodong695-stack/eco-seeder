import { describe, it, expect, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';

describe('DailyTask GameBridge events', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  describe('DAILY_TASKS_GENERATED', () => {
    it('emits with correct payload structure', () => {
      let received: unknown = null;
      gameBridge.on('DAILY_TASKS_GENERATED', (payload) => {
        received = payload;
      });

      gameBridge.emit('DAILY_TASKS_GENERATED', {
        tasks: [
          {
            instanceId: 'inst-1',
            taskId: 'daily_test',
            localDate: '2025-06-18',
            mapId: 'map.urban_wasteland',
            status: 'available',
            progress: 0,
            targetValue: 3,
            rewardClaimed: false,
          },
        ],
      });

      expect(received).not.toBeNull();
      const payload = received as { tasks: unknown[] };
      expect(payload.tasks).toHaveLength(1);
    });

    it('supports unsubscribe', () => {
      let callCount = 0;
      const unsub = gameBridge.on('DAILY_TASKS_GENERATED', () => {
        callCount++;
      });

      gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: [] });
      expect(callCount).toBe(1);

      unsub();
      gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: [] });
      expect(callCount).toBe(1);
    });
  });

  describe('DAILY_TASK_STATUS_CHANGED', () => {
    it('emits with correct payload', () => {
      let received: unknown = null;
      gameBridge.on('DAILY_TASK_STATUS_CHANGED', (payload) => {
        received = payload;
      });

      gameBridge.emit('DAILY_TASK_STATUS_CHANGED', {
        instanceId: 'inst-1',
        taskId: 'daily_test',
        previousStatus: 'available',
        currentStatus: 'active',
      });

      const payload = received as Record<string, string>;
      expect(payload).not.toBeNull();
      expect(payload.instanceId).toBe('inst-1');
      expect(payload.taskId).toBe('daily_test');
      expect(payload.previousStatus).toBe('available');
      expect(payload.currentStatus).toBe('active');
    });
  });

  describe('DAILY_TASK_PROGRESS_CHANGED', () => {
    it('emits with correct payload', () => {
      let received: unknown = null;
      gameBridge.on('DAILY_TASK_PROGRESS_CHANGED', (payload) => {
        received = payload;
      });

      gameBridge.emit('DAILY_TASK_PROGRESS_CHANGED', {
        instanceId: 'inst-1',
        taskId: 'daily_test',
        progress: 2,
        targetValue: 3,
      });

      const payload = received as Record<string, unknown>;
      expect(payload).not.toBeNull();
      expect(payload.progress).toBe(2);
      expect(payload.targetValue).toBe(3);
    });
  });

  describe('DAILY_TASK_COMPLETED', () => {
    it('emits with correct payload', () => {
      let received: unknown = null;
      gameBridge.on('DAILY_TASK_COMPLETED', (payload) => {
        received = payload;
      });

      gameBridge.emit('DAILY_TASK_COMPLETED', {
        instanceId: 'inst-1',
        taskId: 'daily_test',
      });

      const payload = received as Record<string, string>;
      expect(payload).not.toBeNull();
      expect(payload.instanceId).toBe('inst-1');
      expect(payload.taskId).toBe('daily_test');
    });
  });

  describe('DAILY_TASK_PROGRESS_SIGNAL', () => {
    it('emits with correct payload', () => {
      let received: unknown = null;
      gameBridge.on('DAILY_TASK_PROGRESS_SIGNAL', (payload) => {
        received = payload;
      });

      gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
        objectiveType: 'drainage_check',
        amount: 1,
        sourceId: 'interaction.drainage_facility_01',
      });

      const payload = received as Record<string, unknown>;
      expect(payload).not.toBeNull();
      expect(payload.objectiveType).toBe('drainage_check');
      expect(payload.amount).toBe(1);
      expect(payload.sourceId).toBe('interaction.drainage_facility_01');
    });

    it('supports optional sourceId', () => {
      let received: unknown = null;
      gameBridge.on('DAILY_TASK_PROGRESS_SIGNAL', (payload) => {
        received = payload;
      });

      gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
        objectiveType: 'ecology_patrol',
        amount: 1,
      });

      const payload = received as Record<string, unknown>;
      expect(payload).not.toBeNull();
      expect(payload.sourceId).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('removes all handlers', () => {
      let count = 0;
      gameBridge.on('DAILY_TASK_COMPLETED', () => {
        count++;
      });

      gameBridge.clear();
      gameBridge.emit('DAILY_TASK_COMPLETED', { instanceId: 'x', taskId: 'y' });
      expect(count).toBe(0);
    });
  });

  describe('multiple events', () => {
    it('different event types do not interfere', () => {
      let generatedCount = 0;
      let completedCount = 0;

      gameBridge.on('DAILY_TASKS_GENERATED', () => generatedCount++);
      gameBridge.on('DAILY_TASK_COMPLETED', () => completedCount++);

      gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: [] });
      gameBridge.emit('DAILY_TASK_COMPLETED', { instanceId: 'x', taskId: 'y' });
      gameBridge.emit('DAILY_TASKS_GENERATED', { tasks: [] });

      expect(generatedCount).toBe(2);
      expect(completedCount).toBe(1);
    });
  });
});
