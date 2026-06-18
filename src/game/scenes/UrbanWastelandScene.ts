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
 *
 * DEV-04 扩展：
 * - 污染物堆升级为按住 E 持续清理机制；
 * - 集成 RestorationController 管理修复行为状态机；
 * - 修复进度通过 GameBridge 同步到 React UI；
 * - 环境效果通过 EnvironmentStore 管理；
 * - 场景视觉阶段由环境状态驱动（polluted → recovering）；
 * - 输入模式扩展 restoration 状态。
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
import { useTaskStore } from '@/store/taskStore';
import { useUIStore, type InputMode } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import {
  POLLUTION_ZONE_01_TARGET,
  findRestorationTargetByInteractionId,
} from '../restoration/restorationDefinitions';
import { RestorationController } from '../restoration/RestorationController';
import type { RestorationVisualStage } from '../restoration/restorationTypes';
import { DayNightVisualController } from '../time/DayNightVisualController';
import { WeatherVisualController } from '../weather/WeatherVisualController';
import { useWorldStore } from '@/store/worldStore';
import type { DayPhase } from '@/domain/time/timeTypes';
import type { WeatherType } from '@/domain/weather/weatherTypes';

const SCENE_KEY = V0_1_MAIN_MAP_IDENTITY.sceneKey;

/** 首个任务 ID 常量。 */
const FIRST_TASK_ID = 'task.urban_wasteland.pollution_cleanup_01';

/** 污染物堆交互对象 ID。 */
const POLLUTION_ZONE_INTERACTION_ID = 'interaction.pollution_zone_01';

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

  /** 背景矩形引用 — 用于视觉阶段变化。 */
  private backgroundRect!: Phaser.GameObjects.Rectangle;
  /** 修复区域附近的占位植被图形列表。 */
  private vegetationGraphics: Phaser.GameObjects.Rectangle[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private eKey!: Phaser.Input.Keyboard.Key;

  private interactionHintText!: Phaser.GameObjects.Text;

  /** 最近的可用交互对象 ID（交互对象或 NPC）。 */
  private nearestInteractionId: string | null = null;
  /** 标记最近的是否为 NPC。 */
  private nearestIsNpc: boolean = false;
  private nearestNpcId: string | null = null;

  /** UI Store 输入模式订阅取消函数。 */
  private unsubInputMode: (() => void) | null = null;
  /** 视觉阶段变化事件取消函数。 */
  private unsubscribeVisualStage?: () => void;
  /** 当前输入模式。 */
  private inputMode: InputMode = 'gameplay';
  /** 标记场景是否已 shutdown，防止重复清理和延迟回调。 */
  private isShutdown = false;
  /** 幂等清理标志 — 保证 handleSceneCleanup 只执行一次。 */
  private cleanupCompleted = false;

  /** 修复行为控制器。 */
  private restorationController: RestorationController | null = null;

  /** 昼夜视觉控制器。 */
  private dayNightController: DayNightVisualController | null = null;
  /** 天气视觉控制器。 */
  private weatherController: WeatherVisualController | null = null;
  /** 世界状态订阅取消函数。 */
  private unsubWorldStore: (() => void) | null = null;
  /** 当前昼夜阶段。 */
  private currentDayPhase: DayPhase | null = null;
  /** 当前天气。 */
  private currentWeatherType: WeatherType | null = null;

  constructor() {
    super({ key: SCENE_KEY });
  }

  create(): void {
    const { width: W, height: H } = WORLD_BOUNDS;

    // 重置清理标志 — 支持同一 Scene 实例重新进入（React Strict Mode / 返回开始页后再次进入）
    this.cleanupCompleted = false;
    this.isShutdown = false;

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
    this.backgroundRect = this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a2e);
    this.backgroundLayer.add(this.backgroundRect);

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

    // 修复控制器初始化
    this.restorationController = new RestorationController(POLLUTION_ZONE_01_TARGET);

    // 昼夜和天气视觉控制器初始化
    this.dayNightController = new DayNightVisualController(this);
    this.weatherController = new WeatherVisualController(this);

    // 初始化世界状态（时间 + 天气）
    this.initWorldState();

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

    // 订阅 UI 输入模式变化
    this.setupInputModeSubscription();

    // 根据已有环境状态恢复视觉阶段
    this.restoreVisualStage();

    // 显式绑定 Phaser Scene 生命周期事件 — 不能假设定义 shutdown() 就会被自动调用
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleSceneCleanup,
      this,
    );
    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.handleSceneCleanup,
      this,
    );

    // 注册 VISUAL_STAGE_CHANGED 前先取消旧订阅，防止重复注册
    this.unsubscribeVisualStage?.();
    this.unsubscribeVisualStage = gameBridge.on('VISUAL_STAGE_CHANGED', (payload) => {
      // 只允许当前未销毁、活跃的 Scene 处理
      if (
        this.isShutdown ||
        !this.sys.isActive() ||
        this.cleanupCompleted
      ) {
        return;
      }
      this.applyVisualStage(payload.stage);
    });

    // 通知 React 层场景已就绪
    gameBridge.emit('GAME_READY', { mapId: V0_1_MAIN_MAP_IDENTITY.id });
  }

  update(_time: number, delta: number): void {
    this.handlePlayerMovement();
    this.updateInteractions();
    this.updateRestoration(delta);
  }

  /**
   * 幂等场景清理 — 由 Phaser SHUTDOWN / DESTROY 事件显式触发。
   *
   * 不能假设 Phaser 会自动调用名为 shutdown() 的普通方法；
   * 必须在 create() 中通过 events.once(SHUTDOWN/DESTROY) 显式绑定。
   */
  private handleSceneCleanup(): void {
    if (this.cleanupCompleted) return;
    this.cleanupCompleted = true;
    this.isShutdown = true;

    // 强制中断修复
    if (this.restorationController) {
      this.restorationController.forceInterrupt('场景销毁');
    }

    // 取消 UI Store 订阅
    this.unsubInputMode?.();
    this.unsubInputMode = null;

    // 取消视觉阶段事件订阅
    this.unsubscribeVisualStage?.();
    this.unsubscribeVisualStage = undefined;

    // 取消世界状态订阅
    this.unsubWorldStore?.();
    this.unsubWorldStore = null;

    // 销毁昼夜和天气视觉控制器
    this.dayNightController?.destroy();
    this.dayNightController = null;
    this.weatherController?.destroy();
    this.weatherController = null;

    // 重置世界状态
    useWorldStore.getState().resetWorld();

    // 注销键盘监听
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }

    // 显式销毁所有 InteractionZone — 不能只依赖 Phaser 自动销毁子对象
    this.interactionZones.forEach((z) => z.destroy());
    this.interactionZones = [];

    // 销毁 NPC
    this.npcEntities.forEach((npc) => {
      npc.label.destroy();
      npc.gameObject.destroy();
    });
    this.npcEntities = [];

    // 销毁植被图形
    this.vegetationGraphics.forEach((g) => g.destroy());
    this.vegetationGraphics = [];

    // 恢复输入模式到安全状态
    useUIStore.getState().setInputMode('gameplay');

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

      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(config.width, config.height);
      body.updateFromGameObject();

      this.physics.add.collider(this.player.gameObject, rect);

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
    // E 键 — 使用 Phaser Key 对象检测持续按住状态
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // E 键 keydown — 用于检查类交互（非修复）
    this.input.keyboard.on('keydown-E', () => {
      this.handleEKeyDown();
    });
  }

  /**
   * 订阅 UI Store 的输入模式变化。
   */
  private setupInputModeSubscription(): void {
    this.unsubInputMode = useUIStore.subscribe((state) => {
      // 如果从 restoration 切换到其他模式（非 gameplay），中断修复
      if (
        this.inputMode === 'restoration' &&
        state.inputMode !== 'restoration' &&
        state.inputMode !== 'gameplay'
      ) {
        this.restorationController?.interrupt('UI 打开');
      }
      this.inputMode = state.inputMode;
    });
    this.inputMode = useUIStore.getState().inputMode;
  }

  private getMovementInput(): MovementInput {
    // 输入锁定时（非 gameplay），所有方向归零
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
    let pollutionZoneInRange = false;
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
      // 追踪污染物堆是否在范围内
      if (zone.available && zone.config.id === POLLUTION_ZONE_INTERACTION_ID) {
        pollutionZoneInRange = true;
      }
    }

    // 更新修复控制器的范围状态
    if (this.restorationController) {
      this.restorationController.setInRange(pollutionZoneInRange);
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

    // 更新提示文本 — 修复中优先显示修复提示
    if (this.restorationController) {
      const restorationStatus = this.restorationController.getStatus();
      if (restorationStatus === 'in_progress' || restorationStatus === 'interrupted') {
        // 修复进行中或中断时，显示修复相关提示
        const hint = this.restorationController.getInteractionHint();
        this.interactionHintText.setText(hint);
        this.interactionHintText.setVisible(true);
        this.nearestInteractionId = POLLUTION_ZONE_INTERACTION_ID;
        this.nearestIsNpc = false;
        this.nearestNpcId = null;
        return;
      }
    }

    // NPC 优先于交互对象
    if (nearestNpc) {
      this.nearestInteractionId = nearestNpc.config.id;
      this.nearestIsNpc = true;
      this.nearestNpcId = nearestNpc.config.id;
      this.interactionHintText.setText(
        `${nearestNpc.config.displayName} — 按 E 对话`,
      );
      this.interactionHintText.setVisible(true);
    } else if (nearestAvailable) {
      // 根据修复状态和任务状态决定提示文本
      let hint: string;
      const display = nearestAvailable.config.displayName;
      if (nearestAvailable.config.id === POLLUTION_ZONE_INTERACTION_ID) {
        // 使用修复控制器获取提示
        if (this.restorationController) {
          hint = this.restorationController.getInteractionHint();
        } else {
          hint = '按 E 检查';
        }
      } else {
        hint = '按 E 交互';
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

  /**
   * 每帧更新修复行为。
   */
  private updateRestoration(delta: number): void {
    if (!this.restorationController) return;

    // 更新 E 键持续状态
    const eHeld = this.eKey?.isDown ?? false;
    this.restorationController.setEKeyHeld(eHeld);

    // 更新控制器（基于 delta 时间累积进度）
    this.restorationController.update(delta);
  }

  /**
   * E 键 keydown 处理 — 用于检查类交互。
   * 修复行为通过持续按住触发，不在此处理。
   */
  private handleEKeyDown(): void {
    // 修复中或非 gameplay 模式时，禁止检查交互
    if (this.inputMode !== 'gameplay') return;

    // 如果最近的是污染物堆，根据修复状态决定行为
    if (
      this.nearestInteractionId === POLLUTION_ZONE_INTERACTION_ID &&
      !this.nearestIsNpc
    ) {
      if (this.restorationController) {
        const status = this.restorationController.getStatus();
        const taskStatus = useTaskStore.getState().getTaskStatus(FIRST_TASK_ID);

        if (status === 'completed') {
          // 已完成 — 显示已完成提示
          this.emitInteractionFeedback(
            POLLUTION_ZONE_INTERACTION_ID,
            '该区域已经完成临时清理，请返回林工处报告。',
          );
          return;
        }

        if (taskStatus !== 'active') {
          // 未接取任务 — 基础检查反馈
          this.emitInteractionFeedback(
            POLLUTION_ZONE_INTERACTION_ID,
            '已检查污染区域，需要先向林工了解修复任务。',
          );
          return;
        }

        // 任务 active 且未完成 — 修复由持续按住 E 驱动
        // keydown 时不做即时完成
        return;
      }
    }

    // NPC 交互
    if (this.nearestIsNpc && this.nearestNpcId) {
      this.openNpcDialog(this.nearestNpcId);
      return;
    }

    // 其他交互对象
    if (this.nearestInteractionId) {
      this.handleInteractionObject(this.nearestInteractionId);
    }
  }

  /**
   * 发出交互反馈事件。
   */
  private emitInteractionFeedback(objectId: string, message: string): void {
    const zone = this.interactionZones.find((z) => z.config.id === objectId);
    if (!zone) return;

    const currentTime = this.time.now;
    if (!zone.tryTrigger(currentTime)) return;

    gameBridge.emit('INTERACTION_TRIGGERED', {
      objectId,
      displayName: zone.config.displayName,
      type: zone.config.type,
      message,
    });
  }

  private openNpcDialog(npcId: string): void {
    const npcDef = NPC_DEFINITIONS.find((n) => n.id === npcId);
    if (!npcDef) return;

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

    // 其他交互对象 — 原有逻辑
    gameBridge.emit('INTERACTION_TRIGGERED', {
      objectId,
      displayName: zone.config.displayName,
      type: zone.config.type,
      message: zone.config.feedbackMessage,
    });
  }

  /**
   * 根据环境 Store 状态恢复场景视觉阶段。
   * 场景重新初始化时调用。
   */
  private restoreVisualStage(): void {
    const envStore = useEnvironmentStore.getState();
    const stage = envStore.visualStage;
    this.applyVisualStage(stage);

    // 如果修复已完成，更新污染物堆视觉和控制器状态
    const target = findRestorationTargetByInteractionId(POLLUTION_ZONE_INTERACTION_ID);
    if (target) {
      const isCompleted = envStore.isEffectApplied(target.id);
      if (isCompleted) {
        const recoveringStage = target.visualStages.find((s) => s.stage === 'recovering');
        if (recoveringStage) {
          this.applyTargetVisual(recoveringStage);
        }
        // 同步修复控制器状态为已完成
        if (this.restorationController) {
          this.restorationController.syncCompleted();
        }
      }
    }
  }

  /**
   * 应用场景视觉阶段变化。
   */
  private applyVisualStage(stage: RestorationVisualStage): void {
    // 场景已关闭时不处理视觉更新
    if (this.isShutdown || this.cleanupCompleted) return;

    const target = findRestorationTargetByInteractionId(POLLUTION_ZONE_INTERACTION_ID);
    if (!target) return;

    const stageConfig = target.visualStages.find((s) => s.stage === stage);
    if (!stageConfig) return;

    // 更新背景色调
    if (this.backgroundRect && this.backgroundRect.scene) {
      this.backgroundRect.setFillStyle(stageConfig.backgroundTint);
    }

    // 更新污染物堆视觉
    this.applyTargetVisual(stageConfig);

    // recovering 阶段添加占位植被
    if (stage === 'recovering') {
      this.addPlaceholderVegetation();
    }
  }

  /**
   * 应用污染物堆视觉变化。
   *
   * 只修改现有对象属性，不销毁后继续操作旧引用。
   */
  private applyTargetVisual(
    stageConfig: { targetColor: number; targetAlpha: number; targetScale: number },
  ): void {
    // 场景已关闭时不处理
    if (this.isShutdown || this.cleanupCompleted) return;

    const zone = this.interactionZones.find(
      (z) => z.config.id === POLLUTION_ZONE_INTERACTION_ID,
    );
    if (!zone || zone.isDestroyed) return;

    zone.updateVisual({
      color: stageConfig.targetColor,
      alpha: stageConfig.targetAlpha,
      scale: stageConfig.targetScale,
    });

    // 更新标签 — 在 updateVisual 之后调用，确保操作的是同一有效对象
    if (stageConfig.targetAlpha < 0.6) {
      zone.setLabelText('已清理');
    }
  }

  /**
   * 添加占位植被图形。
   */
  private addPlaceholderVegetation(): void {
    if (this.vegetationGraphics.length > 0) return;

    // 在污染物堆附近添加少量占位植被
    const target = POLLUTION_ZONE_01_TARGET;
    const interactionObj = INTERACTION_OBJECTS.find(
      (o) => o.id === POLLUTION_ZONE_INTERACTION_ID,
    );
    if (!interactionObj) return;

    const baseX = interactionObj.x;
    const baseY = interactionObj.y;
    void target;

    // 添加 3 个小绿色矩形作为占位植被
    const positions = [
      { x: baseX - 40, y: baseY + 20 },
      { x: baseX + 35, y: baseY + 15 },
      { x: baseX - 10, y: baseY + 40 },
    ];

    for (const pos of positions) {
      const veg = this.add.rectangle(pos.x, pos.y, 12, 16, 0x7ed957, 0.8);
      this.interactiveLayer.add(veg);
      this.vegetationGraphics.push(veg);
    }
  }

  /**
   * 初始化世界状态 — 时间服务和天气系统。
   *
   * 初始化幂等，重复进入不产生重复计时器。
   */
  private initWorldState(): void {
    const worldStore = useWorldStore.getState();

    // 初始化世界状态（时间 + 天气时间线）
    worldStore.init();

    // 应用当前昼夜和天气视觉
    const { timeSnapshot, weatherSnapshot } = useWorldStore.getState();
    this.applyDayPhase(timeSnapshot.phase);
    this.applyWeatherVisual(weatherSnapshot.weather);

    // 发射初始事件
    gameBridge.emit('WORLD_TIME_CHANGED', {
      previous: null,
      current: timeSnapshot,
    });
    gameBridge.emit('DAY_PHASE_CHANGED', {
      previousPhase: null,
      currentPhase: timeSnapshot.phase,
      mode: timeSnapshot.mode,
      localMinutes: timeSnapshot.localMinutes,
    });

    const timeline = useWorldStore.getState().getWeatherTimeline();
    if (timeline) {
      gameBridge.emit('WEATHER_TIMELINE_GENERATED', { timeline });
    }

    gameBridge.emit('WEATHER_CHANGED_V2', {
      previousWeather: null,
      current: weatherSnapshot,
    });

    // 订阅世界状态变化
    this.unsubWorldStore = useWorldStore.subscribe((state) => {
      if (this.isShutdown || this.cleanupCompleted) return;

      // 昼夜阶段变化
      if (state.timeSnapshot.phase !== this.currentDayPhase) {
        const prevPhase = this.currentDayPhase;
        this.applyDayPhase(state.timeSnapshot.phase);
        gameBridge.emit('DAY_PHASE_CHANGED', {
          previousPhase: prevPhase,
          currentPhase: state.timeSnapshot.phase,
          mode: state.timeSnapshot.mode,
          localMinutes: state.timeSnapshot.localMinutes,
        });
      }

      // 天气变化
      if (state.weatherSnapshot.weather !== this.currentWeatherType) {
        const prevWeather = this.currentWeatherType;
        this.applyWeatherVisual(state.weatherSnapshot.weather);
        gameBridge.emit('WEATHER_CHANGED_V2', {
          previousWeather: prevWeather,
          current: state.weatherSnapshot,
        });
      }
    });
  }

  /**
   * 应用昼夜阶段视觉。
   */
  private applyDayPhase(phase: DayPhase): void {
    if (this.isShutdown || this.cleanupCompleted) return;
    this.currentDayPhase = phase;
    this.dayNightController?.applyPhase(phase);
  }

  /**
   * 应用天气视觉。
   */
  private applyWeatherVisual(weather: WeatherType): void {
    if (this.isShutdown || this.cleanupCompleted) return;
    this.currentWeatherType = weather;
    this.weatherController?.applyWeather(weather);
  }
}

export { SCENE_KEY as URBAN_WASTELAND_SCENE_KEY };
