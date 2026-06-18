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
  /** 持有创建此对象的 Scene 引用，用于销毁后验证。 */
  private readonly scene: Phaser.Scene;
  private isAvailable = false;
  private lastTriggerTime = 0;
  private destroyed = false;

  constructor(scene: Phaser.Scene, config: InteractionObjectConfig) {
    this.config = config;
    this.scene = scene;

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
    if (!this.isGameObjectValid()) return;
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
   *
   * 不能只检查 wrapper 的 destroyed 标志，因为 Phaser 可能在 Scene 销毁时
   * 直接销毁 Text 的内部 texture/frame/canvas，而 wrapper 尚未标记 destroyed。
   * 必须验证 Text 仍属于当前有效 Scene 且未被 Phaser 内部销毁。
   */
  setLabelText(text: string): void {
    if (this.destroyed || !this.label) return;
    // 验证 label 尚未被 Phaser 内部销毁，且 Scene 仍然活跃
    if (!this.isTextValid()) return;
    this.label.setText(text);
  }

  /** 是否已销毁。 */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // 先销毁 label，再销毁 gameObject
    if (this.label) {
      this.label.destroy();
      this.label = null;
    }
    if (this.gameObject) {
      this.gameObject.destroy();
      this.gameObject = null;
    }
  }

  /**
   * 验证 gameObject Rectangle 对象仍然有效。
   */
  private isGameObjectValid(): boolean {
    if (!this.gameObject) return false;
    if (!this.scene || !this.scene.sys.isActive()) return false;
    if (this.gameObject.scene === null || this.gameObject.scene === undefined) return false;
    return true;
  }

  /**
   * 验证 label Text 对象仍然有效。
   *
   * Phaser 在 Scene 销毁时会直接销毁子对象的 texture/frame/canvas，
   * 但 wrapper 的 destroyed 标志可能尚未被设置。
   * 此方法检查：
   * 1. label 本身的 active 状态；
   * 2. Scene 仍然活跃（未 shutdown/destroy）；
   * 3. label 的 parentContainer 或 scene 仍指向有效 Scene。
   */
  private isTextValid(): boolean {
    if (!this.label) return false;
    // 检查 Scene 是否仍然活跃
    if (!this.scene || !this.scene.sys.isActive()) return false;
    // 检查 label 是否已被 Phaser 内部标记为销毁
    // Phaser Text 对象销毁后，其 scene 引用会变为 null
    if (this.label.scene === null || this.label.scene === undefined) return false;
    return true;
  }
}
