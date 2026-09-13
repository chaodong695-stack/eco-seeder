import Phaser from 'phaser';
import { DEPTH_CONTACT_SHADOW } from '@/game/config/depthConfig';

type ShadowNode = Phaser.GameObjects.Ellipse | null;
export class ContactShadow {
  readonly node: ShadowNode;
  constructor(scene: Phaser.Scene, x: number, y: number, width = 34, height = 10) {
    const add = scene.add as Phaser.GameObjects.GameObjectFactory & { ellipse?: Phaser.GameObjects.GameObjectFactory['ellipse'] };
    this.node = typeof add.ellipse === 'function'
      ? add.ellipse(x, y, width, height, 0x071113, 0.32).setOrigin(0.5, 0.5).setDepth(DEPTH_CONTACT_SHADOW)
      : null;
  }
  sync(x: number, y: number, alpha = 0.32): void {
    if (!this.node?.scene) return;
    this.node.setPosition(x, y).setAlpha(alpha);
  }
  destroy(): void { if (this.node?.scene) this.node.destroy(); }
}
