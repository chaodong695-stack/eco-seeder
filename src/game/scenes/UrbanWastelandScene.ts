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
 *
 * DEV-03 扩展：
 * - 新增占位 NPC（林工），配置驱动位置和碰撞体；
 * - NPC 交互接入对话系统；
 * - 污染物堆交互接入任务目标；
 * - 输入锁定（dialog / settings 模式暂停移动）；
 * - 任务状态通过 TaskStore 管理事件。
 */

import Phaser from 'phaser';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { gameBridge } from '../bridge/GameBridge';
import { Player } from '../entities/Player';
import type { MovementInput } from '../entities/movementVector';
import { InteractionZone } from '../interaction/InteractionZone';
import { INTERACTION_OBJECTS } from '../interaction/interactionObjects';
import { WORLD_BOUNDS, CAMERA_FOLLOW } from '../config/movementConfig';
import { NPC_DEFINITIONS } from '../npc/npcDefinitions';
import type { NpcDefinition } from '../npc/npcTypes';
import { findTaskById } from '../tasks/taskDefinitions';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';

const SCENE_KEY = V0_1_MAIN_MAP_IDENTITY.sceneKey;

/** 首个任务 ID 常量。 */
const FIRST_TASK_ID = 'task.urban_wasteland.pollution_cleanup_01';

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

/** 场景内的 NPC 实体包装。 */
interface NpcEntity {
  config: NpcDefinition;
  gameObject: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  body: Phaser.Physics.Arcade.StaticBody;
  isAvailable: boolean;
}

export class UrbanWastelandScene extends Phaser.Scene {
  private backgroundLayer!: Phaser.GameObjects.Container;
  private midgroundLayer!: Phaser.GameObjects.Container;
  private interactiveLayer!: Phaser.GameObjects.Container;
  private foregroundLayer!: Phaser.GameObjects.Container;
  private effectsLayer!: Phaser.GameObjects.Container;

  private player!: Player;
  private obstacles: Phaser.Physics.Arcade.StaticGroup = undefined!;
  private interactionZones: InteractionZone[] = [];
  private npcEntities: NpcEntity[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;

  private interactionHintText!: Phaser.GameObjects.Text;

  /** 最近的可用交互对象 ID（交互对象或 NPC）。 */
  private nearestInteractionId: string | null = null;
  /** 标记最近的是否为 NPC。 */
  private nearestIsNpc: boolean = false;
  private nearestNpcId: string | null = null;

  /** UI Store 输入模式订阅取消函数。 */
  private unsubInputMode: (() => void) | null = null;
  /** 当前输入模式。 */
  private inputMode: 'gameplay' | 'dialog' | 'settings' = 'gameplay';

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

    // NPC
    this.createNpcs();

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

    // 订阅 UI 输入模式变化（不因重复进入场景重复注册）
    this.setupInputModeSubscription();

    // 通知 React 层场景已就绪
    gameBridge.emit('GAME_READY', { mapId: V0_1_MAIN_MAP_IDENTITY.id });
  }

  update(_time: number, _delta: number): void {
    this.handlePlayerMovement();
    this.updateInteractions();
  }

  shutdown(): void {
    // 取消 UI Store 订阅
    if (this.unsubInputMode) {
      this.unsubInputMode();
      this.unsubInputMode = null;
    }
    // 注销键盘监听
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
    // 销毁交互对象
    this.interactionZones.forEach((z) => z.destroy());
    this.interactionZones = [];
    // 销毁 NPC
    this.npcEntities.forEach((npc) => {
      npc.label.destroy();
      npc.gameObject.destroy();
    });
    this.npcEntities = [];
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

  private createNpcs(): void {
    for (const config of NPC_DEFINITIONS) {
      const rect = this.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        config.color,
      );
      rect.setStrokeStyle(2, 0xffffff, 0.5);
      this.interactiveLayer.add(rect);

      // 添加静态物理体 — NPC 不可被穿过
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(config.width, config.height);
      body.updateFromGameObject();

      // 玩家与 NPC 碰撞
      this.physics.add.collider(this.player.gameObject, rect);

      // NPC 名称标签
      const label = this.add.text(
        config.x,
        config.y - config.height / 2 - 10,
        config.displayName,
        {
          fontSize: '14px',
          color: '#f5b942',
          backgroundColor: 'rgba(8, 23, 26, 0.86)',
          padding: { x: 4, y: 2 },
        },
      );
      label.setOrigin(0.5);
      this.interactiveLayer.add(label);

      this.npcEntities.push({
        config,
        gameObject: rect,
        label,
        body,
        isAvailable: false,
      });
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

  /**
   * 订阅 UI Store 的输入模式变化。
   * React 通过 UI Store 切换输入模式，Scene 读取该状态决定是否暂停移动。
   */
  private setupInputModeSubscription(): void {
    this.unsubInputMode = useUIStore.subscribe((state) => {
      this.inputMode = state.inputMode;
    });
    // 同步初始值
    this.inputMode = useUIStore.getState().inputMode;
  }

  private getMovementInput(): MovementInput {
    // 输入锁定时，所有方向归零
    if (this.inputMode !== 'gameplay') {
      return { up: false, down: false, left: false, right: false };
    }
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

    // 检查交互对象
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
      if (zone.available && !nearestAvailable) {
        nearestAvailable = zone;
      }
    }

    // 检查 NPC 交互范围
    let nearestNpc: NpcEntity | null = null;
    for (const npc of this.npcEntities) {
      const dx = playerX - npc.config.x;
      const dy = playerY - npc.config.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wasAvailable = npc.isAvailable;
      npc.isAvailable = distance <= npc.config.interactionRange;
      if (npc.isAvailable !== wasAvailable) {
        if (npc.isAvailable) {
          gameBridge.emit('INTERACTION_AVAILABLE', {
            objectId: npc.config.id,
            displayName: npc.config.displayName,
            type: 'npc_placeholder',
            hint: '按 E 对话',
          });
        } else {
          gameBridge.emit('INTERACTION_UNAVAILABLE', {
            objectId: npc.config.id,
          });
        }
      }
      if (npc.isAvailable && !nearestNpc) {
        nearestNpc = npc;
      }
    }

    // 更新提示文本 — NPC 优先于交互对象
    if (nearestNpc) {
      this.nearestInteractionId = nearestNpc.config.id;
      this.nearestIsNpc = true;
      this.nearestNpcId = nearestNpc.config.id;
      this.interactionHintText.setText(
        `${nearestNpc.config.displayName} — 按 E 对话`,
      );
      this.interactionHintText.setVisible(true);
    } else if (nearestAvailable) {
      // 根据任务状态决定提示文本
      const taskStatus = useTaskStore.getState().getTaskStatus(FIRST_TASK_ID);
      let hint = '按 E 交互';
      const display = nearestAvailable.config.displayName;
      if (nearestAvailable.config.id === 'interaction.pollution_zone_01') {
        if (taskStatus === 'active') {
          hint = '按 E 清理';
        } else if (taskStatus === 'objective_completed' || taskStatus === 'completed') {
          hint = '按 E 检查';
        }
      }
      this.nearestInteractionId = nearestAvailable.config.id;
      this.nearestIsNpc = false;
      this.nearestNpcId = null;
      this.interactionHintText.setText(`${display} — ${hint}`);
      this.interactionHintText.setVisible(true);
    } else {
      this.nearestInteractionId = null;
      this.nearestIsNpc = false;
      this.nearestNpcId = null;
      this.interactionHintText.setVisible(false);
    }
  }

  private handleInteract(): void {
    // 对话或设置打开时，禁止交互
    if (this.inputMode !== 'gameplay') return;

    if (this.nearestIsNpc && this.nearestNpcId) {
      this.openNpcDialog(this.nearestNpcId);
      return;
    }

    if (this.nearestInteractionId) {
      this.handleInteractionObject(this.nearestInteractionId);
    }
  }

  private openNpcDialog(npcId: string): void {
    const npcDef = NPC_DEFINITIONS.find((n) => n.id === npcId);
    if (!npcDef) return;

    // 通过 UI Store 打开对话（同时设置输入模式为 dialog）
    useUIStore.getState().setNpcDialogOpen(true, npcId);

    gameBridge.emit('NPC_DIALOG_OPEN', {
      npcId: npcDef.id,
      npcName: npcDef.displayName,
      npcRole: npcDef.role,
    });
  }

  private handleInteractionObject(objectId: string): void {
    const zone = this.interactionZones.find((z) => z.config.id === objectId);
    if (!zone) return;

    const currentTime = this.time.now;
    if (!zone.tryTrigger(currentTime)) return;

    const taskId = FIRST_TASK_ID;
    const taskStatus = useTaskStore.getState().getTaskStatus(taskId);

    if (objectId === 'interaction.pollution_zone_01') {
      if (taskStatus === 'active') {
        // 完成任务目标
        const success = useTaskStore.getState().completeObjective(
          taskId,
          objectId,
        );
        if (success) {
          const def = findTaskById(taskId);
          gameBridge.emit('TASK_OBJECTIVE_COMPLETED', {
            taskId,
            interactionId: objectId,
          });
          gameBridge.emit('INTERACTION_TRIGGERED', {
            objectId,
            displayName: zone.config.displayName,
            type: zone.config.type,
            message: '污染物堆已完成临时清理，请返回林工处报告。',
          });
          // 同时发出任务反馈
          gameBridge.emit('TASK_FEEDBACK', {
            message: '污染物堆已完成临时清理，请返回林工处报告。',
          });
          void def; // 保留引用以防未来需要
        }
      } else if (taskStatus === 'objective_completed' || taskStatus === 'completed') {
        // 已完成 — 显示已完成提示
        gameBridge.emit('INTERACTION_TRIGGERED', {
          objectId,
          displayName: zone.config.displayName,
          type: zone.config.type,
          message: '该污染物堆已经完成临时清理。',
        });
      } else {
        // 未接取任务 — 基础检查反馈
        gameBridge.emit('INTERACTION_TRIGGERED', {
          objectId,
          displayName: zone.config.displayName,
          type: zone.config.type,
          message: zone.config.feedbackMessage,
        });
      }
    } else {
      // 其他交互对象 — 原有逻辑
      gameBridge.emit('INTERACTION_TRIGGERED', {
        objectId,
        displayName: zone.config.displayName,
        type: zone.config.type,
        message: zone.config.feedbackMessage,
      });
    }
  }
}

export { SCENE_KEY as URBAN_WASTELAND_SCENE_KEY };
