import { describe, expect, it, vi } from 'vitest';
import Phaser from 'phaser';
import { Player } from '@/game/entities/Player';
import type { MovementInput } from '@/game/entities/movementVector';

vi.mock('phaser', () => ({ default: { GameObjects: { Image: class {
  x = 900; y = 800; width = 1086; height = 1448;
  scaleX = 0.1; displayHeight = 144.8; flipX = false;
  setFlipX(value: boolean) { this.flipX = value; return this; }
  setDepth() { return this; }
} } } }));

const idle: MovementInput = { up: false, down: false, left: false, right: false };
function fixture() {
  // Exercise the real movement method without booting a WebGL game.
  const image = new Phaser.GameObjects.Image({} as Phaser.Scene, 900, 800, 'player-male-side');
  const player = Object.create(Player.prototype) as Player;
  const body = { setSize: vi.fn(), setOffset: vi.fn(), setVelocity: vi.fn() };
  Object.assign(player, { gameObject: image, body,
    label: { setPosition: vi.fn(), setDepth: vi.fn() }, shadow: { sync: vi.fn() },
  });
  return { player, image, body };
}

describe('player facing for the left-facing male and female source artwork', () => {
  it('faces right on D / right input by mirroring the source', () => {
    const { player, image, body } = fixture();
    player.updateMovement({ ...idle, right: true });
    expect(image.flipX).toBe(true);
    expect(body.setVelocity).toHaveBeenCalledWith(520, 0);
  });
  it('faces left on A / left input using the original source', () => {
    const { player, image, body } = fixture();
    image.setFlipX(true);
    player.updateMovement({ ...idle, left: true });
    expect(image.flipX).toBe(false);
    expect(body.setVelocity).toHaveBeenCalledWith(-520, 0);
  });
  it.each([idle, { ...idle, up: true }, { ...idle, down: true }, { ...idle, left: true, right: true }])('retains the last facing when horizontal input cancels or stops: %j', input => {
    const { player, image } = fixture();
    for (const facing of [false, true]) {
      image.setFlipX(facing);
      player.updateMovement(input);
      expect(image.flipX).toBe(facing);
    }
  });
  it('uses the horizontal direction during diagonal movement', () => {
    const { player, image } = fixture();
    player.updateMovement({ ...idle, right: true, up: true });
    expect(image.flipX).toBe(true);
    player.updateMovement({ ...idle, left: true, down: true });
    expect(image.flipX).toBe(false);
  });
});
