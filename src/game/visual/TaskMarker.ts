import Phaser from 'phaser';
import { DEPTH_TASK_MARKER } from '@/game/config/depthConfig';
import { ACTION_PALETTE, type ActionKind } from './visualPalette';

export class TaskMarker {
  readonly node: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.node = scene.add.graphics().setDepth(DEPTH_TASK_MARKER);
    this.node.setVisible(false);
  }
  setVisible(visible: boolean): void { this.node.setVisible(visible); }
  setState(x: number, y: number, kind: ActionKind, selected: boolean, progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    const g = this.node;
    g.clear().setPosition(x, y).lineStyle(selected ? 3 : 2, ACTION_PALETTE[kind].rgb, selected ? 0.95 : 0.7);
    if (kind === 'repair') g.strokePoints([{ x: 0, y: -6 }, { x: 6, y: 0 }, { x: 0, y: 6 }, { x: -6, y: 0 }], true);
    if (kind === 'inspect') g.strokeCircle(0, 0, 5);
    if (kind === 'patrol') g.strokeTriangle(0, -6, 6, 5, -6, 5);
    if (kind === 'hazard') { g.lineBetween(-5, -5, 5, 5); g.lineBetween(-5, 5, 5, -5); }
    if (p > 0) g.beginPath().arc(0, 0, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p).strokePath();
  }
  destroy(): void { if (this.node.scene) this.node.destroy(); }
}
