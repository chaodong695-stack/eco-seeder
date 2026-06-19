import Phaser from 'phaser';
import { PLAYER_SIZE, PLAYER_SPEED } from '@/game/config/movementConfig';
import { DEBUG_HITBOX } from '@/game/config/movementConfig';
import { computeMovementVector, type MovementInput } from './movementVector';

/** 玩家侧视图纹理 key — 在 Scene preload 中加载。 */
export const PLAYER_TEXTURE_KEYS = {
  male: 'player-male-side',
  female: 'player-female-side',
} as const;

/** 玩家侧视图显示高度（像素）。 */
const PLAYER_DISPLAY_HEIGHT = 110;

/**
 * 玩家角色实体。
 *
 * 封装玩家创建、物理体设置和移动逻辑。
 * 当侧视图纹理可用时使用 Image 渲染，否则回退到颜色矩形。
 * 碰撞体始终使用原始矩形 body，不要求精确贴合图片轮廓。
 */
export class Player {
  readonly gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    gender?: 'male' | 'female',
  ) {
    const texKey = gender ? PLAYER_TEXTURE_KEYS[gender] : null;

    if (texKey && scene.textures.exists(texKey)) {
      // 使用侧视图图片
      this.gameObject = scene.add.image(x, y, texKey);
      const img = this.gameObject as Phaser.GameObjects.Image;
      this.scaleImageToHeight(img, PLAYER_DISPLAY_HEIGHT);
      // 原点设在底部中心，使脚底对齐 Y 坐标
      img.setOrigin(0.5, 1);
    } else {
      // 回退到颜色矩形（仅调试时可见）
      const rect = scene.add.rectangle(
        x,
        y,
        PLAYER_SIZE.width,
        PLAYER_SIZE.height,
        0x27d7c4,
        DEBUG_HITBOX ? 1 : 0,
      );
      rect.setOrigin(0.5, 1); // 与 Image 一致，底部对齐
      this.gameObject = rect;
    }

    scene.physics.add.existing(this.gameObject);
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(PLAYER_SIZE.width, PLAYER_SIZE.height);
    // 原点在底部中心时，body offset 需要调整使碰撞体在角色脚部上方
    // Phaser body offset 是从 texture frame 左上角算起的
    // 对于 origin(0.5,1) 的对象，需要居中碰撞体
    const displayW = this.gameObject.displayWidth;
    const displayH = this.gameObject.displayHeight;
    this.body.setOffset(
      (displayW - PLAYER_SIZE.width) / 2,
      displayH - PLAYER_SIZE.height,
    );

    this.label = scene.add.text(x, y - PLAYER_DISPLAY_HEIGHT - 10, label, {
      fontSize: '14px',
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
  ): void {
    const texture = img.texture;
    if (texture && texture.source[0]) {
      const sourceHeight = texture.source[0].height;
      if (sourceHeight > 0) {
        const scale = targetHeight / sourceHeight;
        img.setScale(scale);
      }
    }
  }

  /**
   * 根据输入状态更新玩家移动。
   */
  updateMovement(input: MovementInput): void {
    const { vx, vy } = computeMovementVector(input, PLAYER_SPEED);
    this.body.setVelocity(vx, vy);

    // 更新标签位置 — 角色原点在脚底，标签在头顶上方
    this.label.setPosition(this.gameObject.x, this.gameObject.y - PLAYER_DISPLAY_HEIGHT - 10);

    // 深度排序 — 基于 Y 坐标
    this.gameObject.setDepth(this.gameObject.y);
    this.label.setDepth(this.gameObject.y + 1);
  }

  destroy(): void {
    this.label.destroy();
    this.gameObject.destroy();
  }
}
