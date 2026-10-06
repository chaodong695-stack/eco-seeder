import type Phaser from 'phaser';
import { DEMO_LAYERS, DEMO_SCENE } from '@/content/maps/demoSceneLayout';

/** Owns decoration only; weather, clocks, quests and actors remain in the scene. */
export class DemoSceneBackdrop {
  private layers: { image: Phaser.GameObjects.Image; config: typeof DEMO_LAYERS[number] }[] = [];
  private smokeTween?: Phaser.Tweens.Tween;
  static preload(scene: Phaser.Scene): void {
    for (const layer of DEMO_LAYERS) scene.load.image(`demo-${layer.id}`, layer.path);
  }
  constructor(scene: Phaser.Scene) {
    for (const config of DEMO_LAYERS) {
      const key = `demo-${config.id}`;
      if (!scene.textures.exists(key)) continue;
      const image = scene.add.image(DEMO_SCENE.width / 2, DEMO_SCENE.height / 2, key)
        .setOrigin(0.5).setDisplaySize(DEMO_SCENE.width, DEMO_SCENE.height).setDepth(config.depth);
      this.layers.push({ image, config });
      if (config.id === 'smoke') this.smokeTween = scene.tweens.add({ targets: image, alpha: { from: 0.6, to: 0.95 }, duration: 4800, yoyo: true, repeat: -1 });
    }
  }
  update(delta: number, pointerX: number, pointerY: number, playerX: number, playerY: number): void {
    const smoothing = 1 - Math.exp(-Math.max(0, delta) / 160);
    const px = Math.max(-1, Math.min(1, (pointerX - 960) / 960));
    const py = Math.max(-1, Math.min(1, (pointerY - 540) / 540));
    for (const { image, config } of this.layers) {
      if (config.parallax) image.setPosition(960 + px * config.parallax, 540 + py * config.parallax);
      if (config.id === 'fence' || config.id === 'barrel') {
        const obscured = playerY > 830 && (playerX < 620 || playerX > 1510);
        const alpha = obscured ? 0.3 : 1;
        image.setAlpha(image.alpha + (alpha - image.alpha) * smoothing);
      }
    }
  }
  destroy(): void {
    this.smokeTween?.stop();
    this.smokeTween?.remove();
    this.smokeTween = undefined;
    for (const { image } of this.layers) if (image.scene) image.destroy();
    this.layers = [];
  }
}
