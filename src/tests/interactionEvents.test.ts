import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import type {
  InteractionAvailablePayload,
  InteractionTriggeredPayload,
} from '@/game/interaction/interactionTypes';

describe('GameBridge interaction events', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('emits and receives INTERACTION_AVAILABLE with correct type', () => {
    const handler = vi.fn();
    const unsub = gameBridge.on('INTERACTION_AVAILABLE', handler);

    const payload: InteractionAvailablePayload = {
      objectId: 'interaction.pollution_zone_01',
      displayName: '污染物堆',
      type: 'pollution',
      hint: '按 E 交互',
    };

    gameBridge.emit('INTERACTION_AVAILABLE', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
    unsub();
  });

  it('emits and receives INTERACTION_UNAVAILABLE', () => {
    const handler = vi.fn();
    const unsub = gameBridge.on('INTERACTION_UNAVAILABLE', handler);

    gameBridge.emit('INTERACTION_UNAVAILABLE', {
      objectId: 'interaction.pollution_zone_01',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      objectId: 'interaction.pollution_zone_01',
    });
    unsub();
  });

  it('emits and receives INTERACTION_TRIGGERED with correct data structure', () => {
    const handler = vi.fn();
    const unsub = gameBridge.on('INTERACTION_TRIGGERED', handler);

    const payload: InteractionTriggeredPayload = {
      objectId: 'interaction.pollution_zone_01',
      displayName: '污染物堆',
      type: 'pollution',
      message: '已检查污染区域，正式修复功能将在后续任务中实现。',
    };

    gameBridge.emit('INTERACTION_TRIGGERED', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
    // 验证类型定义符合要求
    expect(payload.objectId).toBeTypeOf('string');
    expect(payload.message).toBeTypeOf('string');
    unsub();
  });

  it('unsubscribe stops receiving events', () => {
    const handler = vi.fn();
    const unsub = gameBridge.on('INTERACTION_TRIGGERED', handler);

    gameBridge.emit('INTERACTION_TRIGGERED', {
      objectId: 'test',
      displayName: 'test',
      type: 'pollution',
      message: 'test',
    });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();

    gameBridge.emit('INTERACTION_TRIGGERED', {
      objectId: 'test',
      displayName: 'test',
      type: 'pollution',
      message: 'test',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
