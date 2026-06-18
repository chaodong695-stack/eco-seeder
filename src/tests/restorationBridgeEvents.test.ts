import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import type {
  RestorationStartedPayload,
  RestorationProgressPayload,
  RestorationInterruptedPayload,
  RestorationCompletedPayload,
  EnvironmentUpdatedPayload,
  VisualStageChangedPayload,
} from '@/game/restoration/restorationTypes';

describe('GameBridge DEV-04 restoration events', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  describe('RESTORATION_STARTED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('RESTORATION_STARTED', handler);

      const payload: RestorationStartedPayload = {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        durationMs: 3000,
      };

      gameBridge.emit('RESTORATION_STARTED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('RESTORATION_PROGRESS', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('RESTORATION_PROGRESS', handler);

      const payload: RestorationProgressPayload = {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        progress: 0.5,
        elapsedMs: 1500,
        durationMs: 3000,
      };

      gameBridge.emit('RESTORATION_PROGRESS', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler.mock.calls[0][0].progress).toBe(0.5);
      unsub();
    });
  });

  describe('RESTORATION_INTERRUPTED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('RESTORATION_INTERRUPTED', handler);

      const payload: RestorationInterruptedPayload = {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        progress: 0.3,
        reason: '松开 E',
        inRange: true,
      };

      gameBridge.emit('RESTORATION_INTERRUPTED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler.mock.calls[0][0].reason).toBe('松开 E');
      unsub();
    });
  });

  describe('RESTORATION_COMPLETED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('RESTORATION_COMPLETED', handler);

      const payload: RestorationCompletedPayload = {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
      };

      gameBridge.emit('RESTORATION_COMPLETED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('ENVIRONMENT_UPDATED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('ENVIRONMENT_UPDATED', handler);

      const payload: EnvironmentUpdatedPayload = {
        pollution: 63,
        vegetation: 25,
        waterQuality: 35,
        restorationProgress: 20,
        visualStage: 'recovering',
      };

      gameBridge.emit('ENVIRONMENT_UPDATED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler.mock.calls[0][0].visualStage).toBe('recovering');
      unsub();
    });
  });

  describe('VISUAL_STAGE_CHANGED', () => {
    it('emits and receives with correct payload', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('VISUAL_STAGE_CHANGED', handler);

      const payload: VisualStageChangedPayload = {
        interactionId: 'interaction.pollution_zone_01',
        stage: 'recovering',
      };

      gameBridge.emit('VISUAL_STAGE_CHANGED', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
      unsub();
    });
  });

  describe('unsubscribe', () => {
    it('stops receiving events after unsubscribe', () => {
      const handler = vi.fn();
      const unsub = gameBridge.on('RESTORATION_STARTED', handler);

      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'test',
        interactionId: 'test',
        displayName: 'test',
        durationMs: 1000,
      });
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();

      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'test',
        interactionId: 'test',
        displayName: 'test',
        durationMs: 1000,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('no duplicate listeners on repeated mount', () => {
    it('supports independent subscriptions without duplicates', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsub1 = gameBridge.on('RESTORATION_PROGRESS', handler1);
      const unsub2 = gameBridge.on('RESTORATION_PROGRESS', handler2);

      gameBridge.emit('RESTORATION_PROGRESS', {
        targetId: 'test',
        interactionId: 'test',
        progress: 0.5,
        elapsedMs: 500,
        durationMs: 1000,
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      unsub1();

      gameBridge.emit('RESTORATION_PROGRESS', {
        targetId: 'test',
        interactionId: 'test',
        progress: 0.6,
        elapsedMs: 600,
        durationMs: 1000,
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(2);

      unsub2();
    });
  });
});
