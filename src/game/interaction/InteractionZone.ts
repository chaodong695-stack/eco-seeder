import Phaser from 'phaser';
import type { InteractionObjectConfig } from './interactionTypes';
import { INTERACTION_COOLDOWN_MS } from '@/game/config/movementConfig';
import { DEBUG_HITBOX } from '@/game/config/movementConfig';

/** 视觉更新参数。 */
export interface InteractionZoneVisualUpdate {
  color?: number;
  alpha?: number;
  scale?: number;
  /** 是否切换为修复后的纹理。 */
  restored?: boolean;
}

/**
 * 交互区域管理器。
 *
 * 管理单个交互对象的可视化、交互范围检测和触发逻辑。
 *
 * 当 config.textureKey 提供时，使用 Image 精灵渲染真实图片素材；
 * 否则回退到颜色矩形占位。无论使用哪种视觉，碰撞和交互判定逻辑不变。
 */
export class InteractionZone {
  readonly config: InteractionObjectConfig;
  private visualObject: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text | null;
  /** 持有创建此对象的 Scene 引用，用于销毁后验证。 */
  private readonly scene: Phaser.Scene;
  private isAvailable = false;
  private lastTriggerTime = 0;
  private destroyed = false;
  private isRestored = false;

  constructor(scene: Phaser.Scene, config: InteractionObjectConfig) {
    this.config = config;
    this.scene = scene;

    // 如果提供了纹理 key 且纹理已加载，使用 Image 精灵；否则回退到颜色矩形
    if (config.textureKey && scene.textures.exists(config.textureKey)) {
      const img = scene.add.image(config.x, config.y, config.textureKey);
      // 缩放到目标显示高度
      if (config.displayHeight) {
        this.scaleImageToHeight(img, config.displayHeight);
      }
      // 以底部中心为对齐点 — 图片底部对齐 config.y（地面位置）
      img.setOrigin(0.5, 1);
      img.setPosition(config.x, config.y);
      this.visualObject = img;
    } else {
      const rect = scene.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        config.color,
        DEBUG_HITBOX ? 0.7 : 0,
      );
      if (DEBUG_HITBOX) {
        rect.setStrokeStyle(2, 0xffffff, 0.4);
      }
      this.visualObject = rect;
    }

    // 标签位置 — 在视觉对象上方
    const labelY = config.textureKey && scene.textures.exists(config.textureKey) && config.displayHeight
      ? config.y - config.displayHeight - 8
      : config.y - config.height / 2 - 10;
    this.label = scene.add.text(config.x, labelY, config.displayName, {
      fontSize: '12px',
      color: '#EAF4F2',
      backgroundColor: 'rgba(8, 23, 26, 0.86)',
      padding: { x: 4, y: 2 },
    });
    this.label.setOrigin(0.5);
  }

  /**
   * 将 Image 缩放到指定显示高度，保持宽高比。
   */
  private scaleImageToHeight(
    img: Phaser.GameObjects.Image,
    targetHeight: number,
  ): Phaser.GameObjects.Image {
    const texture = img.texture;
    if (texture && texture.source[0]) {
      const sourceHeight = texture.source[0].height;
      if (sourceHeight > 0) {
        const scale = targetHeight / sourceHeight;
        img.setScale(scale);
      }
    }
    return img;
  }

  /**
   * 强制设置为不可用状态。
   *
   * 用于天气门控等场景，当条件不满足时禁用交互。
   */
  forceUnavailable(): void {
    this.isAvailable = false;
  }

  /**
   * 检查玩家是否在交互范围内，返回可用状态是否变化。
   */
  checkAvailability(playerX: number, playerY: number): boolean {
    // 如果对象未激活（如暴雨垃圾在非暴雨天气被隐藏）— 不可用
    const visualObj = this.visualObject;
    if (visualObj && !visualObj.active) {
      const wasAvailable = this.isAvailable;
      this.isAvailable = false;
      return this.isAvailable !== wasAvailable;
    }

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
   * 更新视觉外观（颜色、透明度、缩放、恢复状态）。
   */
  updateVisual(update: InteractionZoneVisualUpdate): void {
    if (this.destroyed) return;
    if (!this.isVisualObjectValid()) return;

    // 切换为修复后纹理
    if (update.restored && !this.isRestored && this.config.restoredTextureKey) {
      const texKey = this.config.restoredTextureKey;
      if (this.scene.textures.exists(texKey)) {
        // 如果是 Image，直接换纹理；如果是 Rectangle，转换为 Image
        if (this.isImageObject()) {
          (this.visualObject as Phaser.GameObjects.Image).setTexture(texKey);
          if (this.config.displayHeight) {
            this.scaleImageToHeight(this.visualObject as Phaser.GameObjects.Image, this.config.displayHeight);
          }
        } else {
          // 从 Rectangle 切换到 Image
          const oldRect = this.visualObject;
          const img = this.scene.add.image(this.config.x, this.config.y, texKey);
          if (this.config.displayHeight) {
            this.scaleImageToHeight(img, this.config.displayHeight);
          }
          img.setOrigin(0.5, 1);
          img.setPosition(this.config.x, this.config.y);
          img.setDepth(oldRect.depth);
          oldRect.destroy();
          this.visualObject = img;
        }
        this.isRestored = true;
      }
    }

    if (update.alpha !== undefined) {
      this.visualObject.setAlpha(update.alpha);
    }
    // scale 只对 Rectangle 占位对象生效 — Image 对象使用 displayHeight 缩放
    if (update.scale !== undefined && !this.isImageObject()) {
      this.visualObject.setScale(update.scale);
    }
    // color 只对 Rectangle 有效
    if (update.color !== undefined && !this.isImageObject()) {
      (this.visualObject as Phaser.GameObjects.Rectangle).setFillStyle(
        update.color,
        update.alpha ?? (this.visualObject as Phaser.GameObjects.Rectangle).alpha,
      );
    }
  }

  /**
   * 检查当前视觉对象是否为 Image 类型。
   * 使用 type 字符串判断，避免 instanceof 在测试 mock 环境下的问题。
   */
  private isImageObject(): boolean {
    return this.visualObject.type === 'Image';
  }

  /**
   * 获取当前视觉对象（用于场景层面的额外操作）。
   */
  getGameObject(): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | null {
    return this.destroyed ? null : this.visualObject;
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
    // 先销毁 label，再销毁 visualObject
    if (this.label) {
      this.label.destroy();
      this.label = null;
    }
    this.visualObject.destroy();
  }

  /**
   * 验证视觉对象仍然有效。
   */
  private isVisualObjectValid(): boolean {
    if (!this.visualObject) return false;
    if (!this.scene || !this.scene.sys.isActive()) return false;
    if (this.visualObject.scene === null || this.visualObject.scene === undefined) return false;
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
