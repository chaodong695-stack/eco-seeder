import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class Scene {
    sys = { settings: { key: '' } };
    scene = { stop: vi.fn(), resume: vi.fn() };
    constructor(config?: { key?: string }) { this.sys.settings.key = config?.key ?? ''; }
  }
  return { default: { Scene, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' } }, Scene, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' } };
});

import { createGameConfig } from '@/game/bootstrap/gameConfig';
import { EnvironmentMonitoringScene } from '@/game/scenes/EnvironmentMonitoringScene';
import { PollutionCleanupScene } from '@/game/scenes/PollutionCleanupScene';
import { createDedicatedMapContext, clearDedicatedMapContext } from '@/game/session/dedicatedMapTransition';

describe('dedicated scene configuration', () => {
  beforeEach(() => clearDedicatedMapContext());

  it('registers both dedicated scenes in the game configuration', () => {
    const config = createGameConfig(document.createElement('div'));
    expect(config.scene).toEqual([expect.anything(), expect.anything(), EnvironmentMonitoringScene, PollutionCleanupScene]);
  });

  it('uses the dedicated context to render the monitoring title and handles unavailable video', () => {
    createDedicatedMapContext({ sourceSceneKey: 'urban-wasteland', sourceMapId: 'map.urban_wasteland', interactionId: 'interaction.monitoring_device_01', targetMapId: 'map.environment_monitoring_01', returnPosition: { x: 10, y: 20 } });
    // The Phaser scene is intentionally isolated with a lightweight test double.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene = new EnvironmentMonitoringScene() as any;
    const texts: string[] = [];
    const visual = {
      setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(),
      setStrokeStyle: vi.fn().mockReturnThis(), setText: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };
    const mask = { destroy: vi.fn() };
    const graphics = {
      fillStyle: vi.fn().mockReturnThis(), fillRect: vi.fn().mockReturnThis(),
      createGeometryMask: () => mask, destroy: vi.fn(),
    };
    scene.add = { rectangle: () => visual, text: (_x: number, _y: number, text: string) => { texts.push(text); return visual; } };
    scene.make = { graphics: () => graphics };
    scene.cache = { video: { exists: () => false } };
    scene.scale = { width: 1920, height: 1080 };
    scene.cameras = { main: { setBackgroundColor: () => undefined } };
    scene.input = { keyboard: { on: () => undefined, removeListener: () => undefined } };
    scene.events = { once: () => undefined };
    scene.create();
    expect(texts.join('\n')).toContain('环境监测区');
    expect(visual.setText).toHaveBeenCalledWith('环境监测影像加载失败，请返回后重试');
    expect(texts.join('\n')).toContain('按 ESC 返回主地图');
  });

  it('exposes the pollution cleanup scene with its expected key', () => {
    expect(new PollutionCleanupScene().sys.settings.key).toBe('pollution-cleanup');
  });
});


