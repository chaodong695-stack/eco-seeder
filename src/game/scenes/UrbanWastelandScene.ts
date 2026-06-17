/**
 * UrbanWastelandScene — 雾港旧工业区主场景。
 *
 * DEV-02 实现：
 * - 玩家 WASD / 方向键移动（对角线归一化）；
 * - 地图边界碰撞 + 至少 3 个静态障碍物；
 * - 摄像机平滑跟随；
 * - 至少 1 个占位交互对象（按 E 交互）；
 * - 通过 GameBridge 与 React UI 通信；
 * - 场景退出时注销所有事件和键盘监听。
 */

import Phaser from 'phaser';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { gameBridge } from '../bridge/GameBridge';
import { Player } from '../entities/Player';
import type { MovementInput } from '../entities/movementVector';
import { InteractionZone } from '../interaction/InteractionZone';
import { INTERACTION_OBJECTS } from '../interaction/interactionObjects';
import { WORLD_BOUNDS, CAMERA_FOLLOW } from '../config/movementConfig';

const SCENE_KEY = V0_1_MAIN_MAP_IDENTITY.sceneKey;

/** 静态障碍物配置 — 碰撞区域与视觉轮廓一致。 */
interface ObstacleConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

const OBSTACLES: ObstacleConfig[] = [
  { x: 350, y: 600, width: 160, height: 100, color: 0x1a3538 },
  { x: 900, y: 450, width: 200, height: 120, color: 0x152a2d },
  { x: 1500, y: 700, width: 180, height: 110, color: 0x1f3a3e },
  { x: 700, y: 850, width: 140, height: 80, color: 0x1a3538 },
];

export class UrbanWastelandScene extends Phaser.Scene {
  private backgroundLayer!: Phaser.GameObjects.Container;
  private midgroundLayer!: Phaser.GameObjects.Container;
  private interactiveLayer!: Phaser.GameObjects.Container;
  private foregroundLayer!: Phaser.GameObjects.Container;
  private effectsLayer!: Phaser.GameObjects.Container;

  private player!: Player;
  private obstacles: Phaser.Physics.Arcade.StaticGroup = undefined!;
  private interactionZones: InteractionZone[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;

  private interactionHintText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEY });
  }

  create(): void {
    const { width: W, height: H } = WORLD_BOUNDS;

    // 设置物理世界边界
    this.physics.world.setBounds(0, 0, W, H);

    // 创建分层容器
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

    // 背景
    const skyBg = this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a2e);
    this.backgroundLayer.add(skyBg);

    // 远处建筑轮廓（纯视觉装饰，不参与碰撞）
    this.createPlaceholderBuildings();

    // 地面
    const ground = this.add.rectangle(W / 2, H - 100, W, 200, 0x2a3535);
    this.midgroundLayer.add(ground);

    // 道路 / 活动区域占位
    const road = this.add.rectangle(W / 2, H - 200, W - 200, 60, 0x333f3f);
    this.midgroundLayer.add(road);

    // 静态障碍物 — 碰撞区域与视觉轮廓一致
    this.obstacles = this.physics.add.staticGroup();
    for (const obs of OBSTACLES) {
      const rect = this.add.rectangle(obs.x, obs.y, obs.width, obs.height, obs.color);
      this.midgroundLayer.add(rect);
      // 为视觉对象添加静态物理体
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(obs.width, obs.height);
      body.updateFromGameObject();
      this.obstacles.add(rect);
    }

    // 玩家
    this.player = new Player(this, W / 2, H - 250, '生态修复员');
    this.interactiveLayer.add([this.player.gameObject]);

    // 玩家与障碍物碰撞
    this.physics.add.collider(this.player.gameObject, this.obstacles);

    // 交互对象
    this.createInteractionObjects();

    // 交互提示文本（跟随摄像机）
    this.interactionHintText = this.add
      .text(W / 2, H - 120, '', {
        fontSize: '16px',
        color: '#27d7c4',
        backgroundColor: 'rgba(8, 23, 26, 0.86)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);
    this.interactionHintText.setVisible(false);

    // 地图名称（固定在画面上方）
    this.add
      .text(W / 2, 30, V0_1_MAIN_MAP_IDENTITY.displayName, {
        fontSize: '18px',
        color: '#27d7c4',
        backgroundColor: 'rgba(8, 23, 26, 0.86)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);

    // 摄像机
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.startFollow(
      this.player.gameObject,
      true,
      CAMERA_FOLLOW.lerpX,
      CAMERA_FOLLOW.lerpY,
    );
    this.cameras.main.setZoom(1);

    // 输入
    this.setupInput();

    // 通知 React 层场景已就绪
    gameBridge.emit('GAME_READY', { mapId: V0_1_MAIN_MAP_IDENTITY.id });
  }

  update(_time: number, _delta: number): void {
    this.handlePlayerMovement();
    this.updateInteractions();
  }

  shutdown(): void {
    // 注销键盘监听
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
    // 销毁交互对象
    this.interactionZones.forEach((z) => z.destroy());
    this.interactionZones = [];
    // 清理 GameBridge 中本场景相关事件
    gameBridge.emit('INTERACTION_UNAVAILABLE', { objectId: '' });
  }

  // ─── 私有方法 ──────────────────────────────────────────

  private createPlaceholderBuildings(): void {
    const buildingColors = [0x1a3538, 0x152a2d, 0x1f3a3e];
    const { height: H } = WORLD_BOUNDS;
    for (let i = 0; i < 8; i++) {
      const x = 100 + i * 230;
      const bHeight = 150 + ((i * 37) % 200);
      const building = this.add.rectangle(
        x,
        H - 200 - bHeight / 2,
        120,
        bHeight,
        buildingColors[i % buildingColors.length],
      );
      this.backgroundLayer.add(building);
    }
  }

  private createInteractionObjects(): void {
    for (const config of INTERACTION_OBJECTS) {
      const zone = new InteractionZone(this, config);
      this.interactionZones.push(zone);
    }
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
    // E 键交互 — keydown 事件天然防止单帧重复触发
    this.input.keyboard.on('keydown-E', () => {
      this.handleInteract();
    });
  }

  private getMovementInput(): MovementInput {
    return {
      up: this.cursors.up.isDown || this.wasdKeys.W.isDown,
      down: this.cursors.down.isDown || this.wasdKeys.S.isDown,
      left: this.cursors.left.isDown || this.wasdKeys.A.isDown,
      right: this.cursors.right.isDown || this.wasdKeys.D.isDown,
    };
  }

  private handlePlayerMovement(): void {
    const input = this.getMovementInput();
    this.player.updateMovement(input);
  }

  private updateInteractions(): void {
    const playerX = this.player.gameObject.x;
    const playerY = this.player.gameObject.y;

    let nearestAvailable: InteractionZone | null = null;

    for (const zone of this.interactionZones) {
      const changed = zone.checkAvailability(playerX, playerY);
      if (changed) {
        if (zone.available) {
          gameBridge.emit('INTERACTION_AVAILABLE', {
            objectId: zone.config.id,
            displayName: zone.config.displayName,
            type: zone.config.type,
            hint: '按 E 交互',
          });
        } else {
          gameBridge.emit('INTERACTION_UNAVAILABLE', {
            objectId: zone.config.id,
          });
        }
      }
      if (zone.available) {
        // 取最近的可用交互对象
        if (!nearestAvailable) {
          nearestAvailable = zone;
        }
      }
    }

    // 更新提示文本
    if (nearestAvailable) {
      this.interactionHintText.setText(
        `${nearestAvailable.config.displayName} — 按 E 交互`,
      );
      this.interactionHintText.setVisible(true);
    } else {
      this.interactionHintText.setVisible(false);
    }
  }

  private handleInteract(): void {
    const currentTime = this.time.now;
    for (const zone of this.interactionZones) {
      if (zone.tryTrigger(currentTime)) {
        gameBridge.emit('INTERACTION_TRIGGERED', {
          objectId: zone.config.id,
          displayName: zone.config.displayName,
          type: zone.config.type,
          message: zone.config.feedbackMessage,
        });
        break; // 只触发一个
      }
    }
  }
}

export { SCENE_KEY as URBAN_WASTELAND_SCENE_KEY };
