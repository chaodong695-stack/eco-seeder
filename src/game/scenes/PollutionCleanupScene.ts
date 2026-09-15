import Phaser from 'phaser';
import { clearDedicatedMapContext, getDedicatedMapContext } from '@/game/session/dedicatedMapTransition';
import { getDedicatedMapForContext } from '@/content/maps/dedicatedMaps';

export class PollutionCleanupScene extends Phaser.Scene {
  private returning = false;

  constructor() { super({ key: 'pollution-cleanup' }); }

  create(): void {
    const context = getDedicatedMapContext();
    const map = context ? getDedicatedMapForContext(context) : undefined;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2b1b16');
    this.add.rectangle(width / 2, height / 2, width * 0.82, height * 0.72, 0x513226, 0.96).setStrokeStyle(2, 0xd5a066, 0.8);
    this.add.text(width / 2, height * 0.27, map?.displayName ?? '污染物处理区', { fontFamily: 'sans-serif', fontSize: '32px', color: '#fff1d8' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.39, context ? `地图：${context.targetMapId}\n交互点：${context.interactionId}` : '未找到污染处理地图请求', { align: 'center', fontFamily: 'monospace', fontSize: '16px', color: '#e0c09c' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.56, '这是污染物处理的专属占位地图。\n后续可在此接入清理、分类和污染恢复操作。', { align: 'center', fontFamily: 'sans-serif', fontSize: '20px', color: '#fff8ed' }).setOrigin(0.5);
    const hint = this.add.text(width / 2, height * 0.78, '按 ESC 返回主地图', { fontFamily: 'sans-serif', fontSize: '18px', color: '#f0c27b' }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', this.returnToMain, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeListener('keydown-ESC', this.returnToMain, this);
      hint.destroy();
      this.returning = false;
    });
  }

  private returnToMain(): void {
    if (this.returning) return;
    this.returning = true;
    const context = getDedicatedMapContext();
    clearDedicatedMapContext();
    this.scene.stop();
    if (context) this.scene.resume(context.sourceSceneKey);
  }
}
