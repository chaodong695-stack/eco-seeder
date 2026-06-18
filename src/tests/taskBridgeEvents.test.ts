import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import type {
  NpcDialogOpenPayload,
  NpcDialogClosePayload,
  TaskAcceptedPayload,
  TaskObjectiveCompletedPayload,
  TaskCompletedPayload,
  TaskFeedbackPayload,
} from '@/game/bridge/GameBridge';

describe('GameBridge DEV-03 task events', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  describe('NPC_DIALOG_OPEN', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('NPC_DIALOG_OPEN', handler);

      const payload: NpcDialogOpenPayload = {
        npcId: 'npc.engineer.lin',
        npcName: '林工',
        npcRole: '生态修复工程师',
      };

      gameBridge.emit('NPC_DIALOG_OPEN', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('NPC_DIALOG_CLOSE', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('NPC_DIALOG_CLOSE', handler);

      const payload: NpcDialogClosePayload = {
        npcId: 'npc.engineer.lin',
      };

      gameBridge.emit('NPC_DIALOG_CLOSE', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('TASK_ACCEPTED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('TASK_ACCEPTED', handler);

      const payload: TaskAcceptedPayload = {
        taskId: 'task.urban_wasteland.pollution_cleanup_01',
        npcId: 'npc.engineer.lin',
      };

      gameBridge.emit('TASK_ACCEPTED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('TASK_OBJECTIVE_COMPLETED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('TASK_OBJECTIVE_COMPLETED', handler);

      const payload: TaskObjectiveCompletedPayload = {
        taskId: 'task.urban_wasteland.pollution_cleanup_01',
        interactionId: 'interaction.pollution_zone_01',
      };

      gameBridge.emit('TASK_OBJECTIVE_COMPLETED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('TASK_COMPLETED', () => {
    it('emits and receives with correct payload including reward', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('TASK_COMPLETED', handler);

      const payload: TaskCompletedPayload = {
        taskId: 'task.urban_wasteland.pollution_cleanup_01',
        npcId: 'npc.engineer.lin',
        reward: { ecoPoints: 10, reputation: 5 },
      };

      gameBridge.emit('TASK_COMPLETED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler.mock.calls[0][0].reward.ecoPoints).toBe(10);
      expect(handler.mock.calls[0][0].reward.reputation).toBe(5);
      unsub();
    });
  });

  describe('TASK_FEEDBACK', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('TASK_FEEDBACK', handler);

      const payload: TaskFeedbackPayload = {
        message: '污染物堆已完成临时清理，请返回林工处报告。',
      };

      gameBridge.emit('TASK_FEEDBACK', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('unsubscribe', () => {
    it('stops receiving events after unsubscribe', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('TASK_ACCEPTED', handler);

      gameBridge.emit('TASK_ACCEPTED', {
        taskId: 'test',
        npcId: 'test',
      });
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();

      gameBridge.emit('TASK_ACCEPTED', {
        taskId: 'test',
        npcId: 'test',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple handlers (no duplicate events)', () => {
    it('supports multiple independent subscriptions', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsub1 = gameBridge.on('TASK_COMPLETED', handler1);
      const unsub2 = gameBridge.on('TASK_COMPLETED', handler2);

      gameBridge.emit('TASK_COMPLETED', {
        taskId: 'test',
        npcId: 'test',
        reward: { ecoPoints: 0, reputation: 0 },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      unsub1();

      gameBridge.emit('TASK_COMPLETED', {
        taskId: 'test',
        npcId: 'test',
        reward: { ecoPoints: 0, reputation: 0 },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(2);

      unsub2();
    });
  });
});
