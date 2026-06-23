/**
 * 昼夜视觉控制器 — 根据 DayPhase 改变场景光照表现。
 *
 * 使用 Phaser Camera tint / Graphics Overlay 实现昼夜色调。
 * 阶段切换采用平滑过渡（300–800ms）。
 * 不因切换阶段重新创建整个 Phaser Game。
 * Scene shutdown 时清理 tween 和覆盖层。
 */

import Phaser from 'phaser';
import type { DayPhase } from '@/domain/time/timeTypes';

/** 昼夜阶段视觉配置。 */
interface DayPhaseVisualConfig {
  tintColor: number;
  tintAlpha: number;
}

/** 各阶段的视觉配置。 */
const PHASE_VISUALS: Record<DayPhase, DayPhaseVisualConfig> = {
  dawn: { tintColor: 0xffd4a3, tintAlpha: 0.15 },
  day: { tintColor: 0xffffff, tintAlpha: 0 },
  dusk: { tintColor: 0xff7733, tintAlpha: 0.2 },
  night: { tintColor: 0x1a1a4e, tintAlpha: 0.4 },
};

/** 过渡持续时间（毫秒）。 */
const TRANSITION_DURATION = 500;

export class DayNightVisualController {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private currentPhase: DayPhase | null = null;
  private activeTween: Phaser.Tweens.Tween | null = null;
  private isDestroyed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 应用昼夜阶段视觉。
   *
   * 同一阶段重复应用幂等。
   * 阶段切换时停止旧 Tween。
   */
  applyPhase(phase: DayPhase): void {
    if (this.isDestroyed) return;
    if (this.currentPhase === phase && this.overlay && this.overlay.scene) return;

    const config = PHASE_VISUALS[phase];
    const { width, height } = this.scene.scale;

    // 创建覆盖层（如果不存在）
    if (!this.overlay || !this.overlay.scene) {
      this.overlay = this.scene.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        config.tintColor,
        config.tintAlpha,
      );
      this.overlay.setDepth(35);
      this.overlay.setScrollFactor(0);
      this.currentPhase = phase;
      return;
    }

    // 停止旧 Tween
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }

    // 平滑过渡
    this.activeTween = this.scene.tweens.add({
      targets: this.overlay,
      fillColor: { from: this.overlay.fillColor, to: config.tintColor },
      alpha: { from: this.overlay.alpha, to: config.tintAlpha },
      duration: TRANSITION_DURATION,
      ease: 'Linear',
      onComplete: () => {
        this.activeTween = null;
      },
    });

    this.currentPhase = phase;
  }

  /**
   * 获取当前阶段。
   */
  getCurrentPhase(): DayPhase | null {
    return this.currentPhase;
  }

  /**
   * 销毁控制器 — 清理 tween 和覆盖层。
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }

    if (this.overlay && this.overlay.scene) {
      this.overlay.destroy();
    }
    this.overlay = null;
    this.currentPhase = null;
  }
}
