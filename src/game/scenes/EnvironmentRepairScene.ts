import Phaser from 'phaser';
import { clearRepairMapContext, getRepairMapContext } from '@/game/session/repairMapTransition';

export class EnvironmentRepairScene extends Phaser.Scene {
  private returning = false;

  constructor() { super({ key: 'environment-repair' }); }

  create(): void {
    const context = getRepairMapContext();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#10282b');
    this.add.rectangle(width / 2, height / 2, width * 0.82, height * 0.72, 0x1e4545, 0.96).setStrokeStyle(2, 0x66d5c7, 0.8);
    this.add.text(width / 2, height * 0.27, '\u73af\u5883\u4fee\u590d\u533a', { fontFamily: 'sans-serif', fontSize: '32px', color: '#d8fff5' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.39, context ? `\u53d7\u635f\u70b9\uff1a${context.objectId}` : '\u672a\u627e\u5230\u4fee\u590d\u8bf7\u6c42', { fontFamily: 'monospace', fontSize: '16px', color: '#a9d8d1' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.56, '\u8fd9\u662f\u53d7\u635f\u73af\u5883\u7684\u4e13\u7528\u4fee\u590d\u5730\u56fe\u3002\n\u540e\u7eed\u53ef\u5728\u6b64\u5b8c\u6210\u4fee\u590d\u64cd\u4f5c\u3002', { align: 'center', fontFamily: 'sans-serif', fontSize: '20px', color: '#f0fffb' }).setOrigin(0.5);
    const hint = this.add.text(width / 2, height * 0.78, '\u6309 ESC / R \u8fd4\u56de\u4e3b\u5730\u56fe', { fontFamily: 'sans-serif', fontSize: '18px', color: '#7be7d7' }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', this.returnToMain, this);
    this.input.keyboard?.on('keydown-R', this.returnToMain, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      hint.destroy();
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
