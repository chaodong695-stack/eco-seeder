import { describe, it, expect } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';

describe('GameBridge', () => {
  it('emits and receives events', () => {
    let received: { mapId: string } | null = null;
    const unsub = gameBridge.on('GAME_READY', (payload) => {
      received = payload;
    });
    gameBridge.emit('GAME_READY', { mapId: 'map.urban_wasteland' });
    expect(received).toEqual({ mapId: 'map.urban_wasteland' });
    unsub();
  });

  it('supports multiple handlers', () => {
    let count = 0;
    const unsub1 = gameBridge.on('PLAYER_INTERACT', () => { count++; });
    const unsub2 = gameBridge.on('PLAYER_INTERACT', () => { count++; });
    gameBridge.emit('PLAYER_INTERACT', { targetId: 'test' });
    expect(count).toBe(2);
    unsub1();
    unsub2();
  });

  it('unsubscribes correctly', () => {
    let count = 0;
    const unsub = gameBridge.on('DUNGEON_STARTED', () => { count++; });
    gameBridge.emit('DUNGEON_STARTED', { dungeonId: 'test' });
    expect(count).toBe(1);
    unsub();
    gameBridge.emit('DUNGEON_STARTED', { dungeonId: 'test' });
    expect(count).toBe(1);
  });

  it('handles handler errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unsub = gameBridge.on('WEATHER_CHANGED', () => {
      throw new Error('test error');
    });
    gameBridge.emit('WEATHER_CHANGED', { weather: 'rain' });
    expect(consoleSpy).toHaveBeenCalled();
    unsub();
    consoleSpy.mockRestore();
  });
});
