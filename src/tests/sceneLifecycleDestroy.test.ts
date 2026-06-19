import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InteractionObjectConfig } from '@/game/interaction/interactionTypes';

// Mock Phaser with scene lifecycle support
vi.mock('phaser', () => {
  const SHUTDOWN = 'shutdown';
  const DESTROY = 'destroy';

  class EventEmitter {
    private listeners: Map<string, Array<{ fn: () => void; ctx: unknown }>> = new Map();

    on(event: string, fn: () => void, ctx?: unknown): void {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push({ fn, ctx: ctx ?? null });
    }

    once(event: string, fn: () => void, ctx?: unknown): void {
      const wrapper = () => {
        this.off(event, wrapper);
        fn.call(ctx);
      };
      this.on(event, wrapper, ctx);
    }

    off(event: string, fn: () => void): void {
      const arr = this.listeners.get(event);
      if (arr) {
        const idx = arr.findIndex((l) => l.fn === fn);
        if (idx >= 0) arr.splice(idx, 1);
      }
    }

    emit(event: string): void {
      const arr = this.listeners.get(event);
      if (arr) {
        [...arr].forEach(({ fn, ctx }) => fn.call(ctx));
      }
    }

    removeAllListeners(): void {
      this.listeners.clear();
    }
  }

  class MockRectangle {
    fillColor = 0;
    fillAlpha = 1;
    alpha = 1;
    scaleX = 1;
    scaleY = 1;
    type = 'Rectangle';
    depth = 0;
    destroyed = false;
    scene: MockScene | null;

    constructor(scene: MockScene) {
      this.scene = scene;
    }

    setFillStyle(color: number, alpha?: number): void {
      if (this.destroyed) throw new Error('Cannot set fillStyle on destroyed object');
      if (!this.scene) throw new Error('Cannot set fillStyle: scene is null');
      this.fillColor = color;
      if (alpha !== undefined) this.fillAlpha = alpha;
    }
    setAlpha(a: number): void {
      if (this.destroyed) throw new Error('Cannot set alpha on destroyed object');
      if (!this.scene) throw new Error('Cannot set alpha: scene is null');
      this.alpha = a;
    }
    setScale(s: number): void {
      if (this.destroyed) throw new Error('Cannot set scale on destroyed object');
      if (!this.scene) throw new Error('Cannot set scale: scene is null');
      this.scaleX = s;
      this.scaleY = s;
    }
    setStrokeStyle(): void {}
    destroy(): void {
      this.destroyed = true;
      this.scene = null;
    }
  }

  class MockText {
    text: string;
    destroyed = false;
    scene: MockScene | null;

    constructor(scene: MockScene, _x: number, _y: number, text: string) {
      this.scene = scene;
      this.text = text;
    }
    setOrigin(): void {}
    setText(text: string): void {
      if (this.destroyed) throw new Error('Cannot setText on destroyed object');
      if (!this.scene) throw new Error('Cannot setText: scene is null (texture/frame invalid)');
      this.text = text;
    }
    destroy(): void {
      this.destroyed = true;
      this.scene = null;
    }
  }

  class MockSceneSystem {
    private active = true;
    isActive(): boolean { return this.active; }
    setActive(v: boolean): void { this.active = v; }
  }

  class MockScene extends EventEmitter {
    add = {
      rectangle: (_x: number, _y: number, _w: number, _h: number, color: number, alpha?: number) => {
        const rect = new MockRectangle(this);
        rect.fillColor = color;
        if (alpha !== undefined) rect.fillAlpha = alpha;
        return rect;
      },
      text: (_x: number, _y: number, text: string) => new MockText(this, _x, _y, text),
      image: () => new MockRectangle(this),
    };
    textures = {
      exists: () => false,
    };
    sys = new MockSceneSystem();
    events = this;

    simulateShutdown(): void {
      this.sys.setActive(false);
      this.emit(SHUTDOWN);
    }

    simulateDestroy(): void {
      this.sys.setActive(false);
      this.emit(DESTROY);
    }
  }

  return {
    default: {
      Scene: MockScene,
      Game: class {},
      Scenes: { Events: { SHUTDOWN, DESTROY } },
    },
    Scene: MockScene,
    Scenes: { Events: { SHUTDOWN, DESTROY } },
  };
});

const Phaser = await import('phaser');
const { InteractionZone } = await import('@/game/interaction/InteractionZone');

const TEST_CONFIG: InteractionObjectConfig = {
  id: 'interaction.test_zone',
  type: 'pollution',
  displayName: '测试对象',
  x: 50,
  y: 50,
  width: 64,
  height: 64,
  interactionRange: 80,
  feedbackMessage: 'test',
  color: 0x8b4422,
};

describe('InteractionZone — Scene lifecycle destroy order', () => {
  let scene: import('phaser').Scene;

  beforeEach(() => {
    scene = new Phaser.Scene() as unknown as import('phaser').Scene;
  });

  it('zone created with active scene — setLabelText works normally', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);
    expect(() => zone.setLabelText('测试')).not.toThrow();
  });

  it('zone created with active scene — updateVisual works normally', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);
    expect(() =>
      zone.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
  });

  it('after Scene shutdown — setLabelText does not throw (Phaser may have destroyed Text internally)', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    // Scene shutdown — simulates Phaser SceneManager shutting down the scene
    // Phaser destroys child objects (Text, Rectangle) during shutdown
    (scene as unknown as { simulateShutdown: () => void }).simulateShutdown();

    // Even though zone.destroyed is false, label.scene is still valid in mock
    // But sys.isActive() returns false, so isTextValid() returns false
    expect(() => zone.setLabelText('已清理')).not.toThrow();
  });

  it('after Scene shutdown — updateVisual does not throw', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    (scene as unknown as { simulateShutdown: () => void }).simulateShutdown();

    expect(() =>
      zone.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
  });

  it('after Scene destroy — setLabelText does not throw', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    (scene as unknown as { simulateDestroy: () => void }).simulateDestroy();

    expect(() => zone.setLabelText('已清理')).not.toThrow();
  });

  it('after Scene destroy — updateVisual does not throw', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    (scene as unknown as { simulateDestroy: () => void }).simulateDestroy();

    expect(() =>
      zone.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
  });

  it('explicit zone.destroy() before Scene shutdown — label and gameObject are nulled', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    zone.destroy();

    expect(zone.isDestroyed).toBe(true);
    expect(zone.getGameObject()).toBeNull();
    // setLabelText should silently return
    expect(() => zone.setLabelText('已清理')).not.toThrow();
    // updateVisual should silently return
    expect(() =>
      zone.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
  });

  it('Scene shutdown then zone.destroy() — no errors (idempotent cleanup)', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    (scene as unknown as { simulateShutdown: () => void }).simulateShutdown();

    // Explicit destroy after scene shutdown — should not throw
    expect(() => zone.destroy()).not.toThrow();
    expect(zone.isDestroyed).toBe(true);
  });

  it('multiple zones — all safe after Scene shutdown', () => {
    const zone1 = new InteractionZone(scene, TEST_CONFIG);
    const zone2 = new InteractionZone(scene, {
      ...TEST_CONFIG,
      id: 'interaction.test_zone_2',
    });

    (scene as unknown as { simulateShutdown: () => void }).simulateShutdown();

    expect(() => zone1.setLabelText('已清理')).not.toThrow();
    expect(() => zone2.setLabelText('已清理')).not.toThrow();
    expect(() =>
      zone1.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
    expect(() =>
      zone2.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
  });

  it('destroy order: label first, then gameObject — both nulled', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    zone.destroy();

    // After destroy, all references should be null
    expect(zone.getGameObject()).toBeNull();
    expect(zone.isDestroyed).toBe(true);
  });

  it('zone works correctly after scene reactivation (simulate re-enter game)', () => {
    const zone = new InteractionZone(scene, TEST_CONFIG);

    // Shutdown
    (scene as unknown as { simulateShutdown: () => void }).simulateShutdown();
    expect(() => zone.setLabelText('已清理')).not.toThrow();

    // Reactivate scene (new scene instance in real code, but test the guard logic)
    (scene as unknown as { sys: { setActive: (v: boolean) => void } }).sys.setActive(true);

    // This is the same zone — in real code a new zone would be created
    // But if somehow the old zone is reused, it should still be safe
    // The destroyed flag is false, scene is active, label.scene is valid
    expect(() => zone.setLabelText('清理中')).not.toThrow();
  });
});
