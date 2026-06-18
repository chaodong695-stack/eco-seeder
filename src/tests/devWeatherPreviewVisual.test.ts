/**
 * 开发天气预览 — WeatherVisualController 资源清理测试。
 *
 * 验证连续切换天气时：
 * - 雨粒子被正确销毁，不累积
 * - 雾层矩形和 tween 被正确停止，不累积
 * - timer 被正确移除，不累积
 * - 退出预览后资源被清理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeatherVisualController } from '@/game/weather/WeatherVisualController';
import type { WeatherType } from '@/domain/weather/weatherTypes';

interface MockRect {
  x: number; y: number; width: number; height: number;
  fillColor: number; alpha: number; scene: unknown;
  setDepth: () => MockRect;
  setScrollFactor: () => MockRect;
  setFillStyle: (c: number, a?: number) => MockRect;
  destroy: () => void;
}

interface MockTween {
  targets: unknown;
  stop: () => void;
}

interface MockTimerEvent {
  remove: () => void;
}

interface MockParticleEmitter {
  scene: unknown;
  setTexture: () => MockParticleEmitter;
  setDepth: () => MockParticleEmitter;
  setScrollFactor: () => MockParticleEmitter;
  destroy: () => void;
}

function createMockScene() {
  const rectangles: MockRect[] = [];
  const tweens: MockTween[] = [];
  const timerEvents: MockTimerEvent[] = [];
  const particleEmitters: MockParticleEmitter[] = [];

  const scene = {
    scale: { width: 1280, height: 720 },
    add: {
      rectangle: vi.fn((x: number, y: number, w: number, h: number, color: number, alpha: number) => {
        const rect: MockRect = {
          x, y, width: w, height: h,
          fillColor: color,
          alpha: alpha ?? 1,
          scene: {},
          setDepth: vi.fn(() => rect),
          setScrollFactor: vi.fn(() => rect),
          setFillStyle: vi.fn((c: number, a?: number) => {
            rect.fillColor = c;
            rect.alpha = a ?? rect.alpha;
            return rect;
          }),
          destroy: vi.fn(() => { rect.scene = null; }),
        };
        rectangles.push(rect);
        return rect;
      }),
      particles: vi.fn(() => {
        const emitter: MockParticleEmitter = {
          scene: {},
          setTexture: vi.fn(() => emitter),
          setDepth: vi.fn(() => emitter),
          setScrollFactor: vi.fn(() => emitter),
          destroy: vi.fn(() => { emitter.scene = null; }),
        };
        particleEmitters.push(emitter);
        return emitter;
      }),
    },
    make: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn(),
        fillRect: vi.fn(),
        generateTexture: vi.fn(),
        destroy: vi.fn(),
      })),
    },
    tweens: {
      add: vi.fn((config: { targets: unknown }): MockTween => {
        const tween: MockTween = {
          targets: config.targets,
          stop: vi.fn(),
        };
        tweens.push(tween);
        return tween;
      }),
    },
    time: {
      addEvent: vi.fn((): MockTimerEvent => {
        const event: MockTimerEvent = { remove: vi.fn() };
        timerEvents.push(event);
        return event;
      }),
    },
    textures: {
      exists: vi.fn(() => false),
      remove: vi.fn(),
    },
    _rectangles: rectangles,
    _tweens: tweens,
    _timerEvents: timerEvents,
    _particleEmitters: particleEmitters,
  };

  return scene as unknown as Phaser.Scene & {
    _rectangles: MockRect[];
    _tweens: MockTween[];
    _timerEvents: MockTimerEvent[];
    _particleEmitters: MockParticleEmitter[];
  };
}

const ALL_WEATHERS: WeatherType[] = [
  'clear',
  'overcast',
  'light_rain',
  'heavy_rain',
  'fog',
];

describe('Dev weather preview — WeatherVisualController resource cleanup', () => {
  let scene: ReturnType<typeof createMockScene>;
  let controller: WeatherVisualController;

  beforeEach(() => {
    scene = createMockScene();
    controller = new WeatherVisualController(scene);
  });

  afterEach(() => {
    controller.destroy();
  });

  it('consecutive weather switches do not accumulate active particle emitters', () => {
    controller.applyWeather('light_rain');
    expect(scene._particleEmitters.filter((e) => e.scene !== null).length).toBe(1);

    controller.applyWeather('heavy_rain');
    expect(scene._particleEmitters.filter((e) => e.scene !== null).length).toBe(1);

    controller.applyWeather('clear');
    expect(scene._particleEmitters.filter((e) => e.scene !== null).length).toBe(0);
  });

  it('consecutive weather switches destroy old particles', () => {
    controller.applyWeather('light_rain');
    const emitter1 = scene._particleEmitters[0];

    controller.applyWeather('heavy_rain');
    expect(emitter1.destroy).toHaveBeenCalled();

    const emitter2 = scene._particleEmitters[1];
    controller.applyWeather('clear');
    expect(emitter2.destroy).toHaveBeenCalled();
  });

  it('switching to fog stops old rain particles and creates fog layers', () => {
    controller.applyWeather('heavy_rain');
    const rainEmitter = scene._particleEmitters[0];

    controller.applyWeather('fog');
    expect(rainEmitter.destroy).toHaveBeenCalled();
    // fog creates overlay + 3 fog rects
    expect(scene._rectangles.filter((r) => r.scene !== null).length).toBeGreaterThanOrEqual(4);
  });

  it('switching from fog to rain destroys fog rects and stops tweens', () => {
    controller.applyWeather('fog');
    // fog creates overlay (depth 36) + 3 fog rects (depth 38)
    // Only fog rects are destroyed on weather change; overlay is reused
    const allRects = [...scene._rectangles];
    const fogRects = allRects.slice(-3); // last 3 are fog layers
    const fogTweens = [...scene._tweens];

    controller.applyWeather('light_rain');

    for (const rect of fogRects) {
      expect(rect.destroy).toHaveBeenCalled();
    }
    for (const tween of fogTweens) {
      expect(tween.stop).toHaveBeenCalled();
    }
  });

  it('heavy_rain timer is removed when switching away', () => {
    controller.applyWeather('heavy_rain');
    const timer = scene._timerEvents[0];
    expect(timer).toBeDefined();

    controller.applyWeather('clear');
    expect(timer.remove).toHaveBeenCalled();
  });

  it('cycling through all 5 weather types leaves at most 1 active emitter', () => {
    for (const w of ALL_WEATHERS) {
      controller.applyWeather(w);
    }
    const activeEmitters = scene._particleEmitters.filter((e) => e.scene !== null);
    expect(activeEmitters.length).toBeLessThanOrEqual(1);
  });

  it('repeatedly applying same weather is idempotent', () => {
    controller.applyWeather('fog');
    const rectCount = scene._rectangles.length;
    const tweenCount = scene._tweens.length;

    controller.applyWeather('fog'); // same weather, should be no-op
    expect(scene._rectangles.length).toBe(rectCount);
    expect(scene._tweens.length).toBe(tweenCount);
  });

  it('destroy cleans up all resources after preview cycle', () => {
    for (const w of ALL_WEATHERS) {
      controller.applyWeather(w);
    }
    controller.destroy();

    expect(controller.getCurrentWeather()).toBeNull();
    const activeEmitters = scene._particleEmitters.filter((e) => e.scene !== null);
    expect(activeEmitters.length).toBe(0);
  });

  it('create/destroy/create after full preview cycle does not accumulate', () => {
    for (const w of ALL_WEATHERS) {
      controller.applyWeather(w);
    }
    controller.destroy();

    const controller2 = new WeatherVisualController(scene);
    controller2.applyWeather('light_rain');
    expect(scene._particleEmitters.filter((e) => e.scene !== null).length).toBe(1);
    controller2.destroy();
  });
});
