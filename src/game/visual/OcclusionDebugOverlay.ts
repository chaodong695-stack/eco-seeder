import Phaser from 'phaser';
export function drawAnchorDebug(
  graphics: Phaser.GameObjects.Graphics,
  caption: Phaser.GameObjects.Text,
  object: { id: string; x: number; baseY: number; depth: number },
): void {
  graphics.lineStyle(1, 0xffd166, 0.9);
  graphics.lineBetween(object.x - 18, object.baseY, object.x + 18, object.baseY);
  graphics.fillStyle(0xffd166, 1).fillCircle(object.x, object.baseY, 3);
  caption.setPosition(object.x + 6, object.baseY - 6).setText(`${object.id} y=${object.baseY} d=${object.depth}`);
}
export interface OcclusionDebugObject {
  id: string;
  x: number;
  baseY: number;
  depth: number;
}

/** 可复用的 DEV 遮挡覆盖层；关闭时只隐藏对象，不创建每帧临时 Text。 */
export class OcclusionDebugOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly captions = new Map<string, Phaser.GameObjects.Text>();

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(5000);
    this.graphics.setVisible(false);
  }

  render(objects: readonly OcclusionDebugObject[], enabled: boolean): void {
    this.graphics.clear();
    this.graphics.setVisible(enabled);
    const active = new Set(objects.map((object) => object.id));
    for (const [id, caption] of this.captions) {
      caption.setVisible(enabled && active.has(id));
    }
    if (!enabled) return;
    for (const object of objects) {
      let caption = this.captions.get(object.id);
      if (!caption) {
        caption = this.scene.add.text(0, 0, '', { fontSize: '10px', color: '#ffd166' }).setDepth(5001);
        this.captions.set(object.id, caption);
      }
      drawAnchorDebug(this.graphics, caption, object);
      caption.setVisible(true);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    for (const caption of this.captions.values()) caption.destroy();
    this.captions.clear();
  }
}
