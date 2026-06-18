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

/**
 * Mock Phaser Scene for testing weather visual controller.
 */
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

describe('WeatherVisualController', () => {
  let scene: ReturnType<typeof createMockScene>;
  let controller: WeatherVisualController;

  beforeEach(() => {
    scene = createMockScene();
    controller = new WeatherVisualController(scene);
  });

  afterEach(() => {
    controller.destroy();
  });

  it('applies clear weather', () => {
    controller.applyWeather('clear');
    expect(controller.getCurrentWeather()).toBe('clear');
  });

  it('applies overcast weather with overlay', () => {
    controller.applyWeather('overcast');
    expect(scene._rectangles.length).toBeGreaterThanOrEqual(1);
  });

  it('applies light_rain with particles', () => {
    controller.applyWeather('light_rain');
    expect(scene._particleEmitters.length).toBe(1);
  });

  it('applies heavy_rain with particles', () => {
    controller.applyWeather('heavy_rain');
    expect(scene._particleEmitters.length).toBe(1);
  });

  it('applies fog with fog rects', () => {
    controller.applyWeather('fog');
    // fog creates 3 rectangles for fog layers + 1 overlay
    expect(scene._rectangles.length).toBeGreaterThanOrEqual(3);
  });

  it('same weather repeated is idempotent', () => {
    controller.applyWeather('clear');
    controller.applyWeather('clear');
    expect(controller.getCurrentWeather()).toBe('clear');
  });

  it('weather change destroys old particles', () => {
    controller.applyWeather('light_rain');
    const oldEmitter = scene._particleEmitters[0];
    controller.applyWeather('clear');
    expect(oldEmitter.destroy).toHaveBeenCalled();
  });

  it('weather change destroys old fog rects', () => {
    controller.applyWeather('fog');
    // fog creates overlay + 3 fog rects. Fog rects have depth 38.
    // We only check the fog layer rects (last 3), not the overlay.
    const allRects = [...scene._rectangles];
    const fogRects = allRects.slice(-3); // last 3 are fog layers
    controller.applyWeather('clear');
    for (const rect of fogRects) {
      expect(rect.destroy).toHaveBeenCalled();
    }
  });

  it('weather change stops old tweens', () => {
    controller.applyWeather('fog');
    const fogTweens = [...scene._tweens];
    controller.applyWeather('clear');
    for (const tween of fogTweens) {
      expect(tween.stop).toHaveBeenCalled();
    }
  });

  it('destroy removes all resources', () => {
    controller.applyWeather('heavy_rain');
    controller.destroy();
    expect(controller.getCurrentWeather()).toBeNull();
  });

  it('destroy is idempotent', () => {
    controller.applyWeather('clear');
    controller.destroy();
    controller.destroy(); // should not throw
  });

  it('does not apply after destroy', () => {
    controller.destroy();
    controller.applyWeather('clear');
    expect(controller.getCurrentWeather()).toBeNull();
  });

  it('create/destroy/create does not accumulate objects', () => {
    controller.applyWeather('light_rain');
    controller.destroy();
    const controller2 = new WeatherVisualController(scene);
    controller2.applyWeather('light_rain');
    expect(scene._particleEmitters.filter((e) => e.scene !== null).length).toBe(1);
    controller2.destroy();
  });

  it('cycles through all weather types without accumulating', () => {
    const weathers: WeatherType[] = ['clear', 'overcast', 'light_rain', 'heavy_rain', 'fog'];
    for (const w of weathers) {
      controller.applyWeather(w);
    }
    // Only one active emitter at most
    const activeEmitters = scene._particleEmitters.filter((e) => e.scene !== null);
    expect(activeEmitters.length).toBeLessThanOrEqual(1);
  });
});
