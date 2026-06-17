/**
 * UrbanWastelandScene — 雾港旧工业区主场景骨架。
 *
 * 依据 05_INTERFACE_CONTRACTS.md 和 14_ART_DIRECTION_BIBLE_v0.1.md：
 * - 使用 Phaser 3 二维场景；
 * - 使用二维坐标和二维碰撞；
 * - 预留前景、中景、远景和深度排序结构；
 * - 玩家占位角色在主场景中可见；
 * - HUD 与场景地图资源独立；
 * - 不使用真实 3D 技术。
 */

import Phaser from 'phaser';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { gameBridge } from '../bridge/GameBridge';

const SCENE_KEY = V0_1_MAIN_MAP_IDENTITY.sceneKey;

// 场景世界尺寸
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;

// 玩家占位角色尺寸
const PLAYER_SIZE = 32;

export class UrbanWastelandScene extends Phaser.Scene {
  // 图层容器 — 预留分层结构
  private backgroundLayer!: Phaser.GameObjects.Container;
  private midgroundLayer!: Phaser.GameObjects.Container;
  private interactiveLayer!: Phaser.GameObjects.Container;
  private foregroundLayer!: Phaser.GameObjects.Container;
  private effectsLayer!: Phaser.GameObjects.Container;

  // 玩家占位角色
  private player!: Phaser.GameObjects.Rectangle;
  private playerLabel!: Phaser.GameObjects.Text;

  // 输入
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: SCENE_KEY });
  }

  create(): void {
    // 设置物理世界边界
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 创建分层容器 — 预留前景、中景、远景和深度排序结构
    this.backgroundLayer = this.add.container(0, 0);
    this.backgroundLayer.setDepth(0);

    this.midgroundLayer = this.add.container(0, 0);
    this.midgroundLayer.setDepth(10);

    this.interactiveLayer = this.add.container(0, 0);
    this.interactiveLayer.setDepth(20);

    this.foregroundLayer = this.add.container(0, 0);
    this.foregroundLayer.setDepth(30);

    this.effectsLayer = this.add.container(0, 0);
    this.effectsLayer.setDepth(40);

    // 创建远景占位 — 灰蓝色天空
    const skyBg = this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x1a2a2e,
    );
    this.backgroundLayer.add(skyBg);

    // 创建中景占位 — 远处建筑轮廓
    this.createPlaceholderBuildings();

    // 创建地面占位
    const ground = this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - 100,
      WORLD_WIDTH,
      200,
      0x2a3535,
    );
    this.midgroundLayer.add(ground);

    // 创建前景占位 — 前景遮挡
    this.createPlaceholderForeground();

    // 创建玩家占位角色
    this.createPlayer();

    // 设置摄像机
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // 设置输入
    this.setupInput();

    // 通知 React 层游戏场景已就绪
    gameBridge.emit('GAME_READY', { mapId: V0_1_MAIN_MAP_IDENTITY.id });
  }

  update(): void {
    this.handlePlayerMovement();
  }

  private createPlaceholderBuildings(): void {
    const buildingColors = [0x1a3538, 0x152a2d, 0x1f3a3e];
    for (let i = 0; i < 8; i++) {
      const x = 100 + i * 230;
      const height = 150 + Math.random() * 200;
      const building = this.add.rectangle(
        x,
        WORLD_HEIGHT - 200 - height / 2,
        120,
        height,
        buildingColors[i % buildingColors.length],
      );
      this.backgroundLayer.add(building);
    }
  }

  private createPlaceholderForeground(): void {
    // 前景栏杆和草丛占位
    for (let i = 0; i < 5; i++) {
      const grass = this.add.rectangle(
        200 + i * 380,
        WORLD_HEIGHT - 60,
        60,
        20,
        0x2d4a3a,
      );
      this.foregroundLayer.add(grass);
    }
  }

  private createPlayer(): void {
    // 占位玩家角色 — 绿色矩形
    this.player = this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - 150,
      PLAYER_SIZE,
      PLAYER_SIZE * 1.5,
      0x27d7c4,
    );

    // 启用物理
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(PLAYER_SIZE, PLAYER_SIZE * 1.5);

    // 玩家标签
    this.playerLabel = this.add.text(
      this.player.x,
      this.player.y - 35,
      '生态修复员',
      {
        fontSize: '14px',
        color: '#EAF4F2',
        backgroundColor: 'rgba(8, 23, 26, 0.86)',
        padding: { x: 4, y: 2 },
      },
    );
    this.playerLabel.setOrigin(0.5);

    this.interactiveLayer.add([this.player, this.playerLabel]);
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // E 键互动占位
    this.input.keyboard.on('keydown-E', () => {
      gameBridge.emit('PLAYER_INTERACT', { targetId: 'placeholder_target' });
    });
  }

  private handlePlayerMovement(): void {
    if (!this.player || !this.player.body) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 200;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      vy = speed;
    }

    body.setVelocity(vx, vy);

    // 更新标签位置
    this.playerLabel.setPosition(this.player.x, this.player.y - 35);

    // 深度排序 — 基于 Y 坐标
    this.player.setDepth(this.player.y);
  }
}

export { SCENE_KEY as URBAN_WASTELAND_SCENE_KEY };
