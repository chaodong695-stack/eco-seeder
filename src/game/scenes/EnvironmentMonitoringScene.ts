import Phaser from 'phaser';
import { clearDedicatedMapContext, getDedicatedMapContext } from '@/game/session/dedicatedMapTransition';
import { getDedicatedMapForContext } from '@/content/maps/dedicatedMaps';

export class EnvironmentMonitoringScene extends Phaser.Scene {
  private returning = false;

  constructor() { super({ key: 'environment-monitoring' }); }

  create(): void {
    const context = getDedicatedMapContext();
    const map = context ? getDedicatedMapForContext(context) : undefined;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#10282b');
    this.add.rectangle(width / 2, height / 2, width * 0.82, height * 0.72, 0x1e4545, 0.96).setStrokeStyle(2, 0x66d5c7, 0.8);
    this.add.text(width / 2, height * 0.27, map?.displayName ?? '环境监测区', { fontFamily: 'sans-serif', fontSize: '32px', color: '#d8fff5' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.39, context ? `地图：${context.targetMapId}\n交互点：${context.interactionId}` : '未找到监测地图请求', { align: 'center', fontFamily: 'monospace', fontSize: '16px', color: '#a9d8d1' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.56, '这是环境监测装置的专属占位地图。\n后续可在此接入数据采集、设备读数和监测任务。', { align: 'center', fontFamily: 'sans-serif', fontSize: '20px', color: '#f0fffb' }).setOrigin(0.5);
    const hint = this.add.text(width / 2, height * 0.78, '按 ESC 返回主地图', { fontFamily: 'sans-serif', fontSize: '18px', color: '#7be7d7' }).setOrigin(0.5);
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
