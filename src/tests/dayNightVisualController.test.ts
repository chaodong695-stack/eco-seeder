import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DayNightVisualController } from '@/game/time/DayNightVisualController';

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

/**
 * Mock Phaser Scene for testing visual controllers.
 */
function createMockScene() {
  const tweens: MockTween[] = [];
  const rectangles: MockRect[] = [];

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
    },
    tweens: {
      add: vi.fn((config: { targets: unknown; onComplete?: () => void }): MockTween => {
        const tween: MockTween = {
          targets: config.targets,
          stop: vi.fn(() => {
            if (config.onComplete) config.onComplete();
          }),
        };
        tweens.push(tween);
        return tween;
      }),
    },
    _rectangles: rectangles,
    _tweens: tweens,
  };

  return scene as unknown as Phaser.Scene & {
    _rectangles: MockRect[];
    _tweens: MockTween[];
  };
}

describe('DayNightVisualController', () => {
  let scene: ReturnType<typeof createMockScene>;
  let controller: DayNightVisualController;

  beforeEach(() => {
    scene = createMockScene();
    controller = new DayNightVisualController(scene);
  });

  afterEach(() => {
    controller.destroy();
  });

  it('creates overlay on first applyPhase', () => {
    controller.applyPhase('day');
    expect(scene._rectangles.length).toBe(1);
  });

  it('same phase repeated is idempotent', () => {
    controller.applyPhase('day');
    const count1 = scene._rectangles.length;
    controller.applyPhase('day');
    expect(scene._rectangles.length).toBe(count1);
  });

  it('phase change creates tween for transition', () => {
    controller.applyPhase('day');
    controller.applyPhase('night');
    expect(scene._tweens.length).toBeGreaterThan(0);
  });

  it('phase change stops previous tween', () => {
    controller.applyPhase('day');
    controller.applyPhase('night');
    const firstTween = scene._tweens[0];
    controller.applyPhase('dawn');
    expect(firstTween.stop).toHaveBeenCalled();
  });

  it('destroy stops active tween', () => {
    controller.applyPhase('day');
    controller.applyPhase('night');
    const tween = scene._tweens[0];
    controller.destroy();
    expect(tween.stop).toHaveBeenCalled();
  });

  it('destroy removes overlay', () => {
    controller.applyPhase('day');
    const rect = scene._rectangles[0];
    controller.destroy();
    expect(rect.destroy).toHaveBeenCalled();
  });

  it('getCurrentPhase returns applied phase', () => {
    controller.applyPhase('dusk');
    expect(controller.getCurrentPhase()).toBe('dusk');
  });

  it('destroy is idempotent', () => {
    controller.applyPhase('day');
    controller.destroy();
    controller.destroy(); // should not throw
  });

  it('does not apply after destroy', () => {
    controller.destroy();
    controller.applyPhase('day');
    expect(scene._rectangles.length).toBe(0);
  });

  it('create/destroy/create does not accumulate objects', () => {
    controller.applyPhase('day');
    controller.destroy();
    const controller2 = new DayNightVisualController(scene);
    controller2.applyPhase('day');
    // Only 1 rectangle should be active (not destroyed)
    const activeRects = scene._rectangles.filter((r) => r.scene !== null);
    expect(activeRects.length).toBe(1);
    controller2.destroy();
  });
});
