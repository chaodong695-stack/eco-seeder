import Phaser from 'phaser';
import { clearRepairMapContext, getRepairMapContext } from '@/game/session/repairMapTransition';
import { attachGovernanceRegion } from '@/game/session/governanceRegion';

const REPAIR_VIDEO_KEY = 'environment-repair-video';

export class EnvironmentRepairScene extends Phaser.Scene {
  private returning = false;

  constructor() { super({ key: 'environment-repair' }); }

  preload(): void {
    this.load.video(REPAIR_VIDEO_KEY, '/assets/动态图生成需求.mp4', true);
  }

  create(): void {
    this.returning = false;
    attachGovernanceRegion(this, 'repair', getRepairMapContext()?.objectId, () => this.returnToMain());
    const { width, height } = this.scale;
    const panelWidth = width * 0.82;
    const panelHeight = height * 0.72;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;
    this.cameras.main.setBackgroundColor('#10282b');
    this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x1e4545, 0.96);
    const status = this.add.text(width / 2, height / 2, '正在加载环境影像…', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#f0fffb',
    }).setOrigin(0.5).setDepth(3);
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff).fillRect(panelX, panelY, panelWidth, panelHeight);
    const mask = maskShape.createGeometryMask();
    if (this.cache.video.exists(REPAIR_VIDEO_KEY)) {
      const video = this.add.video(width / 2, height / 2, REPAIR_VIDEO_KEY);
      video.setDepth(1).setMask(mask).setMute(true);
      video.once('textureready', () => {
        const sourceWidth = video.video?.videoWidth ?? 0;
        const sourceHeight = video.video?.videoHeight ?? 0;
        if (!video.scene || sourceWidth <= 0 || sourceHeight <= 0) return;
        // 等比铺满修复区，溢出部分由矩形遮罩裁切。
        // 首帧事件早于 GameObject 尺寸更新，需使用视频的原始尺寸。
        video.setScale(Math.max(panelWidth / sourceWidth, panelHeight / sourceHeight));
        status.setVisible(false);
      });
      video.on('error', () => status.setText('环境影像加载失败，请返回后重试').setVisible(true));
      video.play(true);
    } else {
      status.setText('环境影像加载失败，请返回后重试');
    }
    this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0, 0)
      .setStrokeStyle(2, 0x66d5c7, 0.8).setDepth(2);
    this.add.text(width / 2, height * 0.20, '环境修复区', {
      fontFamily: 'sans-serif', fontSize: '32px', color: '#d8fff5',
      backgroundColor: '#10282bcc', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(3);
    const hint = this.add.text(width / 2, height * 0.78, '按 ESC / R 返回主地图', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#7be7d7',
      backgroundColor: '#10282bcc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(3);
    this.input.keyboard?.on('keydown-ESC', this.returnToMain, this);
    this.input.keyboard?.on('keydown-R', this.returnToMain, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      hint.destroy();
      mask.destroy();
      maskShape.destroy();
      this.returning = false;
    });
  }

  private returnToMain(): void {
    if (this.returning) return;
    this.returning = true;
    const context = getRepairMapContext();
    clearRepairMapContext();
    this.scene.stop();
    if (context) this.scene.resume(context.sourceSceneKey);
  }
}
