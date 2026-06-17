import Phaser from 'phaser';
import { PLAYER_SIZE, PLAYER_SPEED } from '@/game/config/movementConfig';
import { computeMovementVector, type MovementInput } from './movementVector';

/**
 * 玩家占位角色实体。
 *
 * 封装玩家创建、物理体设置和移动逻辑，
 * 保持 Scene 文件简洁。
 */
export class Player {
  readonly gameObject: Phaser.GameObjects.Rectangle;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
  ) {
    this.gameObject = scene.add.rectangle(
      x,
      y,
      PLAYER_SIZE.width,
      PLAYER_SIZE.height,
      0x27d7c4,
    );

    scene.physics.add.existing(this.gameObject);
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(PLAYER_SIZE.width, PLAYER_SIZE.height);

    this.label = scene.add.text(x, y - 35, label, {
      fontSize: '14px',
      color: '#EAF4F2',
      backgroundColor: 'rgba(8, 23, 26, 0.86)',
      padding: { x: 4, y: 2 },
    });
    this.label.setOrigin(0.5);
  }

  /**
   * 根据输入状态更新玩家移动。
   */
  updateMovement(input: MovementInput): void {
    const { vx, vy } = computeMovementVector(input, PLAYER_SPEED);
    this.body.setVelocity(vx, vy);

    // 更新标签位置
    this.label.setPosition(this.gameObject.x, this.gameObject.y - 35);

    // 深度排序 — 基于 Y 坐标
    this.gameObject.setDepth(this.gameObject.y);
    this.label.setDepth(this.gameObject.y + 1);
  }

  destroy(): void {
    this.label.destroy();
    this.gameObject.destroy();
  }
}
