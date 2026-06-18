import Phaser from 'phaser';
import type { InteractionObjectConfig } from './interactionTypes';
import { INTERACTION_COOLDOWN_MS } from '@/game/config/movementConfig';

/** 视觉更新参数。 */
export interface InteractionZoneVisualUpdate {
  color?: number;
  alpha?: number;
  scale?: number;
}

/**
 * 交互区域管理器。
 *
 * 管理单个交互对象的可视化、交互范围检测和触发逻辑。
 */
export class InteractionZone {
  readonly config: InteractionObjectConfig;
  private gameObject: Phaser.GameObjects.Rectangle | null;
  private label: Phaser.GameObjects.Text | null;
  private isAvailable = false;
  private lastTriggerTime = 0;
  private destroyed = false;

  constructor(scene: Phaser.Scene, config: InteractionObjectConfig) {
    this.config = config;

    this.gameObject = scene.add.rectangle(
      config.x,
      config.y,
      config.width,
      config.height,
      config.color,
      0.7,
    );
    this.gameObject.setStrokeStyle(2, 0xffffff, 0.4);

    this.label = scene.add.text(config.x, config.y - config.height / 2 - 10, config.displayName, {
      fontSize: '12px',
      color: '#EAF4F2',
      backgroundColor: 'rgba(8, 23, 26, 0.86)',
      padding: { x: 4, y: 2 },
    });
    this.label.setOrigin(0.5);
  }

  /**
   * 检查玩家是否在交互范围内，返回可用状态是否变化。
   */
  checkAvailability(playerX: number, playerY: number): boolean {
    const dx = playerX - this.config.x;
    const dy = playerY - this.config.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const wasAvailable = this.isAvailable;
    this.isAvailable = distance <= this.config.interactionRange;

    return this.isAvailable !== wasAvailable;
  }

  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * 尝试触发交互。返回是否成功触发（受冷却限制）。
   */
  tryTrigger(currentTime: number): boolean {
    if (!this.isAvailable) return false;
    if (currentTime - this.lastTriggerTime < INTERACTION_COOLDOWN_MS) return false;

    this.lastTriggerTime = currentTime;
    return true;
  }

  /**
   * 更新视觉外观（颜色、透明度、缩放）。
   */
  updateVisual(update: InteractionZoneVisualUpdate): void {
    if (this.destroyed || !this.gameObject) return;
    if (update.color !== undefined) {
      this.gameObject.setFillStyle(update.color, update.alpha ?? this.gameObject.alpha);
    }
    if (update.alpha !== undefined && update.color === undefined) {
      this.gameObject.setAlpha(update.alpha);
    }
    if (update.scale !== undefined) {
      this.gameObject.setScale(update.scale);
    }
  }

  /**
   * 获取当前视觉对象（用于场景层面的额外操作）。
   */
  getGameObject(): Phaser.GameObjects.Rectangle | null {
    return this.gameObject;
  }

  /**
   * 设置标签文本。
   * 对已销毁对象安全返回，不抛出异常。
   */
  setLabelText(text: string): void {
    if (this.destroyed || !this.label) return;
    this.label.setText(text);
  }

  /** 是否已销毁。 */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.label) {
      this.label.destroy();
      this.label = null;
    }
    if (this.gameObject) {
      this.gameObject.destroy();
      this.gameObject = null;
    }
  }
}
