import { describe, it, expect, vi } from 'vitest';
import type { InteractionObjectConfig } from '@/game/interaction/interactionTypes';

// Mock Phaser to avoid jsdom Canvas issues
vi.mock('phaser', () => {
  class MockRectangle {
    fillColor = 0;
    fillAlpha = 1;
    alpha = 1;
    scaleX = 1;
    scaleY = 1;
    destroyed = false;

    setFillStyle(color: number, alpha?: number): void {
      if (this.destroyed)
        throw new Error('Cannot set fillStyle on destroyed object');
      this.fillColor = color;
      if (alpha !== undefined) this.fillAlpha = alpha;
    }
    setAlpha(a: number): void {
      if (this.destroyed)
        throw new Error('Cannot set alpha on destroyed object');
      this.alpha = a;
    }
    setScale(s: number): void {
      if (this.destroyed)
        throw new Error('Cannot set scale on destroyed object');
      this.scaleX = s;
      this.scaleY = s;
    }
    setStrokeStyle(): void {}
    destroy(): void {
      this.destroyed = true;
    }
  }

  class MockText {
    text: string;
    destroyed = false;

    constructor(_x: number, _y: number, text: string) {
      this.text = text;
    }
    setOrigin(): void {}
    setText(text: string): void {
      if (this.destroyed)
        throw new Error('Cannot setText on destroyed object');
      this.text = text;
    }
    destroy(): void {
      this.destroyed = true;
    }
  }

  class MockScene {
    add = {
      rectangle: (
        _x: number,
        _y: number,
        _w: number,
        _h: number,
        color: number,
        alpha?: number,
      ) => {
        const rect = new MockRectangle();
        rect.fillColor = color;
        if (alpha !== undefined) rect.fillAlpha = alpha;
        return rect;
      },
      text: (_x: number, _y: number, text: string) => {
        return new MockText(_x, _y, text);
      },
    };
  }

  return {
    default: { Scene: MockScene, Game: class {} },
    Scene: MockScene,
  };
});

// Import AFTER mock is set up
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

describe('InteractionZone — destroy safety', () => {
  it('marks destroyed state after destroy()', () => {
    const scene = new Phaser.Scene();
    const zone = new InteractionZone(
      scene as unknown as import('phaser').Scene,
      TEST_CONFIG,
    );

    expect(zone.isDestroyed).toBe(false);

    zone.destroy();

    expect(zone.isDestroyed).toBe(true);
  });

  it('setLabelText does not throw after destroy', () => {
    const scene = new Phaser.Scene();
    const zone = new InteractionZone(
      scene as unknown as import('phaser').Scene,
      TEST_CONFIG,
    );

    zone.destroy();

    expect(() => zone.setLabelText('已清理')).not.toThrow();
  });

  it('updateVisual does not throw after destroy', () => {
    const scene = new Phaser.Scene();
    const zone = new InteractionZone(
      scene as unknown as import('phaser').Scene,
      TEST_CONFIG,
    );

    zone.destroy();

    expect(() =>
      zone.updateVisual({ color: 0x6a7a4a, alpha: 0.5, scale: 0.7 }),
    ).not.toThrow();
  });

  it('getGameObject returns null after destroy', () => {
    const scene = new Phaser.Scene();
    const zone = new InteractionZone(
      scene as unknown as import('phaser').Scene,
      TEST_CONFIG,
    );

    expect(zone.getGameObject()).not.toBeNull();

    zone.destroy();

    expect(zone.getGameObject()).toBeNull();
  });

  it('destroy is idempotent — calling twice does not throw', () => {
    const scene = new Phaser.Scene();
    const zone = new InteractionZone(
      scene as unknown as import('phaser').Scene,
      TEST_CONFIG,
    );

    zone.destroy();
    expect(() => zone.destroy()).not.toThrow();
  });

  it('label.setText is not called after destroy', () => {
    const scene = new Phaser.Scene();
    const zone = new InteractionZone(
      scene as unknown as import('phaser').Scene,
      TEST_CONFIG,
    );

    zone.setLabelText('清理中');
    zone.destroy();

    // After destroy, setLabelText should silently return
    // without attempting to call label.setText (which would throw)
    expect(() => zone.setLabelText('已清理')).not.toThrow();
  });
});
