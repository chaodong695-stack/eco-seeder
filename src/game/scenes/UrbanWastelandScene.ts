/**
 * UrbanWastelandScene — 雾港旧工业区主场景。
 *
 * DEV-02: 玩家移动、碰撞、交互对象、GameBridge
 * DEV-03: NPC 交互、输入锁定
 * DEV-04: 污染物堆持续清理机制、RestorationController
 * DEV-05: 昼夜和天气视觉
 * DEV-06: 每日任务系统、第二 NPC、天气条件任务
 *
 * DEV-06 第二轮修复：
 * - NPC 全部改为非阻挡型（玩家可穿过），通过距离判断交互；
 * - 污染物堆迁移到每日任务进度信号，不再使用旧 taskStore；
 * - NPC 对话防重复触发（dialog 打开时不再重复打开）。
 */

import Phaser from 'phaser';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { gameBridge } from '../bridge/GameBridge';
import { Player } from '../entities/Player';
import type { MovementInput } from '../entities/movementVector';
import { InteractionZone } from '../interaction/InteractionZone';
import { INTERACTION_OBJECTS, SCENE_TEXTURE_KEYS } from '../interaction/interactionObjects';
import {
  WORLD_BOUNDS,
  CAMERA_FOLLOW,
  DEBUG_HITBOX,
  GROUND_TOP_Y,
} from '../config/movementConfig';
import { NPC_DEFINITIONS } from '../npc/npcDefinitions';
import type { NpcDefinition } from '../npc/npcTypes';
import { useUIStore, type InputMode } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { usePlayerStore } from '@/store/playerStore';
import {
  POLLUTION_ZONE_01_TARGET,
  findRestorationTargetByInteractionId,
} from '../restoration/restorationDefinitions';
import { RestorationController } from '../restoration/RestorationController';
import type { RestorationVisualStage } from '../restoration/restorationTypes';
import { DayNightVisualController } from '../time/DayNightVisualController';
import { WeatherVisualController } from '../weather/WeatherVisualController';
import { useWorldStore } from '@/store/worldStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { isWeatherConditionMet } from '@/domain/tasks/dailyTaskConditionResolver';
import type { DayPhase } from '@/domain/time/timeTypes';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import { sceneAssets } from '@/game/assets/assetManifest';

const SCENE_KEY = V0_1_MAIN_MAP_IDENTITY.sceneKey;

/** 场景纹理 key 常量。 */
const SCENE_BG_TEXTURE = 'scene-bg-industrial-wasteland';
const GROUND_TILE_TEXTURE = 'scene-tile-cracked-ground';
const DECOR_RUINS_TEXTURE = 'scene-decor-industrial-ruins';
const DECOR_PLANT_TEXTURE = 'scene-decor-ruin-plant';

/** NPC 立绘纹理 key — 按 NPC ID 映射。 */
const NPC_TEXTURE_KEYS: Record<string, string> = {
  'npc.engineer.lin': 'npc-lin-gong-side',
  'npc_weather_ranger': 'npc-patrol-inspector-side',
};

/** NPC 立绘显示高度（像素）。 */
const NPC_DISPLAY_HEIGHT = 120;

/**
 * 中景废墟装饰是否启用。
 *
 * industrial-ruins-strip.png 的 alpha 通道存在规则网格（~13px 间距）的不透明/透明块，
 * 渲染时产生类似棋盘格的视觉效果。暂时禁用该装饰层，
 * 只保留远景背景、地面、角色、交互物件。
 */
const RUINS_DECOR_ENABLED = false;

/** 深度层级常量。 */
const DEPTH = {
  background: 0,
  decor: 5,
  ground: 10,
  obstacles: 15,
  objects: 20,
  player: 30,
  labels: 40,
  ui: 50,
} as const;

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

/** 地面可视高度（像素）。 */
const GROUND_VISUAL_HEIGHT = 200;

/** 污染物堆交互对象 ID。 */
const POLLUTION_ZONE_INTERACTION_ID = 'interaction.pollution_zone_01';

/** 场景内的 NPC 实体包装。 */
interface NpcEntity {
  config: NpcDefinition;
  /** NPC 视觉对象 — 立绘图片或隐形矩形。 */
  gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  /** NPC 物理体 — 不可见矩形，用于距离检测。 */
  physBody: Phaser.GameObjects.Rectangle;
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
  /** 修复区域附近的植被装饰对象列表。 */
  private vegetationGraphics: Phaser.GameObjects.Image[] = [];

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
  /** 当前开发天气预览（仅开发环境）。 */
  private currentDevWeatherPreview: WeatherType | null = null;

  /** 每日任务进度信号订阅取消函数。 */
  private unsubDailyTaskProgress: (() => void) | null = null;
  /** 每日任务 Store 订阅取消函数。 */
  private unsubDailyTaskStore: (() => void) | null = null;
  /** 天气条件交互对象的 ID 集合。 */
  private readonly weatherGatedObjectIds = new Set([
    'interaction.storm_debris_01',
    'interaction.drainage_facility_01',
    'interaction.fog_hazard_01',
    'interaction.fog_hazard_02',
  ]);
  /** 受损环境点交互对象 ID。 */
  private readonly damagedEnvObjectIds = new Set([
    'interaction.damaged_env_01',
    'interaction.damaged_env_02',
  ]);
  /** 生态巡查点交互对象 ID。 */
  private readonly ecologyPatrolObjectIds = new Set([
    'interaction.ecology_patrol_01',
    'interaction.ecology_patrol_02',
    'interaction.ecology_patrol_03',
  ]);

  constructor() {
    super({ key: SCENE_KEY });
  }

  /**
   * preload — 统一加载主场景图片资源。
   *
   * 所有图片通过 sceneAssets 统一路径引入，纹理 key 集中定义。
   */
  preload(): void {
    this.load.image(SCENE_BG_TEXTURE, sceneAssets.backgrounds.industrialWasteland);
    this.load.image(GROUND_TILE_TEXTURE, sceneAssets.tiles.crackedGround);
    this.load.image(DECOR_RUINS_TEXTURE, sceneAssets.decor.industrialRuinsStrip);
    this.load.image(DECOR_PLANT_TEXTURE, sceneAssets.decor.ruinPlantCluster);

    // 交互物件图片
    this.load.image(SCENE_TEXTURE_KEYS.pollutionPileLarge, sceneAssets.objects.pollutionPileLarge);
    this.load.image(SCENE_TEXTURE_KEYS.restoredPlantsLarge, sceneAssets.objects.restoredPlantsLarge);
    this.load.image(SCENE_TEXTURE_KEYS.drainageFacilityDamaged, sceneAssets.objects.drainageFacilityDamaged);
    this.load.image(SCENE_TEXTURE_KEYS.environmentMonitorDevice, sceneAssets.objects.environmentMonitorDevice);

    // 玩家侧视图
    this.load.image('player-male-side', sceneAssets.characters.maleSide);
    this.load.image('player-female-side', sceneAssets.characters.femaleSide);

    // NPC 立绘
    this.load.image('npc-lin-gong-side', sceneAssets.npc.linGong);
    this.load.image('npc-patrol-inspector-side', sceneAssets.npc.patrolInspector);
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

    // ── 第 0 层：远景背景 ──
    if (this.textures.exists(SCENE_BG_TEXTURE)) {
      const bgImage = this.add.image(W / 2, H / 2, SCENE_BG_TEXTURE);
      // cover 缩放 — 覆盖整个世界但不严重变形
      const scaleX = W / bgImage.width;
      const scaleY = H / bgImage.height;
      const scale = Math.max(scaleX, scaleY);
      bgImage.setScale(scale);
      bgImage.setDepth(DEPTH.background);
      this.backgroundLayer.add(bgImage);
      // 背景引用保留用于色调叠加（如有需要）
      this.backgroundRect = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0);
      this.backgroundLayer.add(this.backgroundRect);
    } else {
      this.backgroundRect = this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a2e);
      this.backgroundLayer.add(this.backgroundRect);
    }

    // 轻微暗色遮罩 — 保证前景可读性
    const darkOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.2);
    darkOverlay.setDepth(DEPTH.background + 0.1);
    this.backgroundLayer.add(darkOverlay);

    // ── 第 1 层：中景废墟装饰 ──
    // industrial-ruins-strip.png 的 alpha 通道存在规则网格，渲染时产生棋盘格效果，已禁用。
    if (RUINS_DECOR_ENABLED && this.textures.exists(DECOR_RUINS_TEXTURE)) {
      const ruinsImg = this.add.image(W / 2, H * 0.45, DECOR_RUINS_TEXTURE);
      // 缩放到场景宽度
      const ruinsScale = W / ruinsImg.width;
      ruinsImg.setScale(ruinsScale);
      ruinsImg.setDepth(DEPTH.decor);
      ruinsImg.setAlpha(0.6); // 降低透明度保证层次感和前景可读性
      this.backgroundLayer.add(ruinsImg);
    } else if (DEBUG_HITBOX) {
      // 仅调试时回退到矩形建筑轮廓
      this.createPlaceholderBuildings();
    }

    // ── 第 2 层：地面 / 平台纹理 ──
    // 使用 tileSprite 平铺地面纹理，确保只占据 GROUND_VISUAL_HEIGHT 高度，不覆盖全屏
    if (this.textures.exists(GROUND_TILE_TEXTURE)) {
      const groundTile = this.add.tileSprite(
        W / 2,
        GROUND_TOP_Y + GROUND_VISUAL_HEIGHT / 2,
        W,
        GROUND_VISUAL_HEIGHT,
        GROUND_TILE_TEXTURE,
      );
      groundTile.setDepth(DEPTH.ground);
      this.midgroundLayer.add(groundTile);
    } else {
      const ground = this.add.rectangle(W / 2, GROUND_TOP_Y + GROUND_VISUAL_HEIGHT / 2, W, GROUND_VISUAL_HEIGHT, 0x2a3535);
      ground.setDepth(DEPTH.ground);
      this.midgroundLayer.add(ground);
    }

    // ── 障碍物 — 仅 DEBUG_HITBOX 时显示可视化矩形 ──
    this.obstacles = this.physics.add.staticGroup();
    for (const obs of OBSTACLES) {
      const rect = this.add.rectangle(obs.x, obs.y, obs.width, obs.height, obs.color);
      rect.setDepth(DEPTH.obstacles);
      rect.setAlpha(DEBUG_HITBOX ? 0.6 : 0); // 正常模式下隐藏障碍物可视化
      this.midgroundLayer.add(rect);
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(obs.width, obs.height);
      body.updateFromGameObject();
      this.obstacles.add(rect);
    }

    // 绿植装饰簇 — 场景装饰，不参与任务判定
    this.createDecorPlants();

    // ── 玩家 — 站立在地面上 ──
    const character = usePlayerStore.getState().character;
    const gender = character?.gender;
    // 玩家脚底对齐地面顶部
    this.player = new Player(this, W / 2, GROUND_TOP_Y, '生态修复员', gender ?? undefined);
    this.interactiveLayer.add([this.player.gameObject]);

    // 玩家与障碍物碰撞
    this.physics.add.collider(this.player.gameObject, this.obstacles);

    // 交互对象
    this.createInteractionObjects();

    // NPC
    this.createNpcs();

    // 修复控制器初始化
    this.restorationController = new RestorationController(POLLUTION_ZONE_01_TARGET);

    // 每日任务进度信号监听
    this.setupDailyTaskListeners();

    // 昼夜和天气视觉控制器初始化
    this.dayNightController = new DayNightVisualController(this);
    this.weatherController = new WeatherVisualController(this);

    // 初始化世界状态（时间 + 天气）
    this.initWorldState();

    // 初始化每日任务（在 worldStore 初始化之后，确保天气时间线可用）
    useDailyTaskStore.getState().init();

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
    this.updateNpcLabels();
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

    // 取消每日任务订阅
    this.unsubDailyTaskProgress?.();
    this.unsubDailyTaskProgress = null;
    this.unsubDailyTaskStore?.();
    this.unsubDailyTaskStore = null;

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
      npc.physBody.destroy();
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

  /**
   * 设置每日任务进度信号监听。
   *
   * 监听 DAILY_TASK_PROGRESS_SIGNAL 事件，将其转发给 dailyTaskStore。
   * Scene shutdown 时注销。
   */
  private setupDailyTaskListeners(): void {
    this.unsubDailyTaskProgress = gameBridge.on('DAILY_TASK_PROGRESS_SIGNAL', (payload) => {
      if (this.isShutdown || this.cleanupCompleted) return;
      useDailyTaskStore.getState().applyProgress({
        objectiveType: payload.objectiveType,
        amount: payload.amount,
        sourceId: payload.sourceId,
      });
    });
  }

  /**
   * 刷新 NPC 标签 — 根据每日任务状态显示提示。
   */
  private updateNpcLabels(): void {
    if (this.isShutdown || this.cleanupCompleted) return;

    for (const npc of this.npcEntities) {
      const npcTasks = useDailyTaskStore.getState().getTasksByNpcId(npc.config.id);
      if (npcTasks.length === 0) continue;

      const allCompleted = npcTasks.every((t) => t.status === 'completed');
      const hasAvailable = npcTasks.some((t) => t.status === 'available');
      const hasWaiting = npcTasks.some((t) => t.status === 'waiting_condition');
      const hasActive = npcTasks.some((t) => t.status === 'active');

      let indicator = '';
      if (allCompleted) {
        indicator = ' ✓';
      } else if (hasAvailable) {
        indicator = ' !';
      } else if (hasWaiting) {
        indicator = ' ⏳';
      } else if (hasActive) {
        indicator = ' …';
      }

      const labelText = `${npc.config.displayName}${indicator}`;
      if (npc.label.text !== labelText && npc.label.scene) {
        npc.label.setText(labelText);
      }
    }
  }

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
      building.setDepth(DEPTH.decor);
      this.backgroundLayer.add(building);
    }
  }

  /**
   * 创建绿植装饰簇 — 使用真实图片素材布置在场景适当位置。
   * 只作为装饰，不参与任务判定。
   */
  private createDecorPlants(): void {
    if (!this.textures.exists(DECOR_PLANT_TEXTURE)) return;

    // 在生态巡查点、修复区域周围、地图边缘布置装饰
    // 脚底对齐地面顶部
    const positions = [
      { x: 200, y: GROUND_TOP_Y, scale: 0.35 },
      { x: 550, y: GROUND_TOP_Y, scale: 0.3 },
      { x: 1000, y: GROUND_TOP_Y, scale: 0.35 },
      { x: 1600, y: GROUND_TOP_Y, scale: 0.3 },
      { x: 150, y: GROUND_TOP_Y - 200, scale: 0.25 },
      { x: 1780, y: GROUND_TOP_Y - 150, scale: 0.25 },
    ];

    for (const pos of positions) {
      const plant = this.add.image(pos.x, pos.y, DECOR_PLANT_TEXTURE);
      plant.setScale(pos.scale);
      plant.setOrigin(0.5, 1); // 底部对齐
      plant.setDepth(DEPTH.decor);
      plant.setAlpha(0.7);
      this.backgroundLayer.add(plant);
    }
  }

  private createInteractionObjects(): void {
    for (const config of INTERACTION_OBJECTS) {
      const zone = new InteractionZone(this, config);
      // 设置深度层级
      const go = zone.getGameObject();
      if (go) go.setDepth(DEPTH.objects);
      this.interactionZones.push(zone);
    }
  }

  private createNpcs(): void {
    for (const config of NPC_DEFINITIONS) {
      const texKey = NPC_TEXTURE_KEYS[config.id];
      const hasTexture = texKey && this.textures.exists(texKey);

      // NPC 视觉对象：优先使用立绘图片，回退到不可见矩形
      let visualObj: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

      if (hasTexture) {
        const img = this.add.image(config.x, config.y, texKey!);
        // 缩放到目标显示高度，保持宽高比
        const texture = img.texture;
        if (texture && texture.source[0]) {
          const sourceHeight = texture.source[0].height;
          if (sourceHeight > 0) {
            img.setScale(NPC_DISPLAY_HEIGHT / sourceHeight);
          }
        }
        // 原点设在底部中心，使脚底对齐地面
        img.setOrigin(0.5, 1);
        img.setPosition(config.x, config.y);
        visualObj = img;
      } else {
        // 回退到不可见矩形（仅用于距离检测）
        const rect = this.add.rectangle(
          config.x,
          config.y,
          config.width,
          config.height,
          config.color,
          DEBUG_HITBOX ? 0.7 : 0,
        );
        if (DEBUG_HITBOX) {
          rect.setStrokeStyle(2, 0xffffff, 0.5);
        }
        visualObj = rect;
      }
      this.interactiveLayer.add(visualObj);

      // 物理体 — 使用不可见矩形用于距离检测，不阻挡玩家
      const physBody = this.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        0x000000,
        0,
      );
      this.interactiveLayer.add(physBody);
      this.physics.add.existing(physBody, true);
      const body = physBody.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(config.width, config.height);
      body.updateFromGameObject();

      // 非阻挡型交互 — 玩家可以穿过 NPC
      this.physics.add.overlap(this.player.gameObject, physBody);
      body.checkCollision.none = true;

      // 标签位置 — 在立绘头顶上方，不遮挡人物主体
      const labelY = hasTexture
        ? config.y - NPC_DISPLAY_HEIGHT - 8
        : config.y - config.height / 2 - 15;
      const label = this.add.text(
        config.x,
        labelY,
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
        gameObject: visualObj,
        physBody,
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
    const currentWeather = useWorldStore.getState().getDisplayWeather();

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
      // 天气门控 — 排水设施在非雨天气不显示交互提示
      if (zone.available && zone.config.id === 'interaction.drainage_facility_01') {
        if (currentWeather !== 'light_rain' && currentWeather !== 'heavy_rain') {
          // 天气条件不满足，不作为可交互对象
          continue;
        }
      }
      // 天气门控 — 雾天危险点在非雾天不显示交互提示
      if (zone.available && (zone.config.id === 'interaction.fog_hazard_01' || zone.config.id === 'interaction.fog_hazard_02')) {
        if (currentWeather !== 'fog') {
          continue;
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
        // 污染物堆 — 显示每日任务相关提示
        hint = this.getPollutionZoneHint();
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
   * 获取污染物堆的交互提示文本。
   *
   * 根据每日任务状态显示不同提示：
   * - 未接取"清理散落垃圾"任务 → 提示先向林工接取
   * - 已接取且未完成 → 按住 E 清理
   * - 已完成 → 已清理
   */
  private getPollutionZoneHint(): string {
    const restorationStatus = this.restorationController?.getStatus();
    if (restorationStatus === 'in_progress') return '正在清理污染物堆';
    if (restorationStatus === 'completed') return '污染物堆 — 已完成清理';
    if (restorationStatus === 'interrupted') return '清理已暂停 — 按住 E 继续';

    // 检查每日任务状态 — 通过 objectiveType 查找
    const wasteTask = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def?.objectiveType === 'collect_waste';
    });

    if (!wasteTask || wasteTask.status === 'available') {
      return '污染物堆 — 请先向林工接取今日清理任务';
    }

    if (wasteTask.status === 'completed') {
      return '污染物堆 — 已完成清理';
    }

    // active 或 waiting_condition
    return '污染物堆 — 按住 E 清理';
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
   *
   * NPC 对话防重复：dialog 已打开时不重复打开。
   */
  private handleEKeyDown(): void {
    // 修复中或非 gameplay 模式时，禁止检查交互
    if (this.inputMode !== 'gameplay') return;

    // 污染物堆交互 — 由每日任务状态控制
    if (
      this.nearestInteractionId === POLLUTION_ZONE_INTERACTION_ID &&
      !this.nearestIsNpc
    ) {
      if (this.restorationController) {
        const status = this.restorationController.getStatus();

        if (status === 'completed') {
          this.emitInteractionFeedback(
            POLLUTION_ZONE_INTERACTION_ID,
            '该区域已经完成清理。',
          );
          return;
        }

        // 检查每日任务状态 — 通过 objectiveType 查找
        const wasteTask = useDailyTaskStore.getState().tasks.find((t) => {
          const def = findDailyTaskById(t.taskId);
          return def?.objectiveType === 'collect_waste';
        });

        if (!wasteTask || wasteTask.status === 'available') {
          // 未接取相应每日任务 — 提示但不创建独立任务
          this.emitInteractionFeedback(
            POLLUTION_ZONE_INTERACTION_ID,
            '请先向林工接取今日清理任务。',
          );
          return;
        }

        if (wasteTask.status === 'completed') {
          this.emitInteractionFeedback(
            POLLUTION_ZONE_INTERACTION_ID,
            '该区域已经完成清理。',
          );
          return;
        }

        // 任务 active 或 waiting_condition — 修复由持续按住 E 驱动
        return;
      }
    }

    // NPC 交互 — 防重复打开对话框
    if (this.nearestIsNpc && this.nearestNpcId) {
      // 如果对话框已经打开，不重复打开
      if (useUIStore.getState().isNpcDialogOpen) return;
      this.openNpcDialog(this.nearestNpcId);
      return;
    }

    // 每日任务天气交互对象
    if (this.nearestInteractionId && !this.nearestIsNpc) {
      if (this.handleWeatherTaskInteraction(this.nearestInteractionId)) {
        return;
      }
    }

    // 受损环境点交互
    if (this.nearestInteractionId && !this.nearestIsNpc && this.damagedEnvObjectIds.has(this.nearestInteractionId)) {
      this.handleRestoreAreaInteraction(this.nearestInteractionId);
      return;
    }

    // 生态巡查点交互
    if (this.nearestInteractionId && !this.nearestIsNpc && this.ecologyPatrolObjectIds.has(this.nearestInteractionId)) {
      this.handleEcologyPatrolInteraction(this.nearestInteractionId);
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

  /**
   * 处理天气任务交互对象（排水设施、暴雨垃圾、雾天危险点）。
   *
   * 只在天气条件满足且任务处于 active 状态时计入进度。
   * 返回 true 表示已处理，false 表示不是天气任务交互。
   */
  private handleWeatherTaskInteraction(objectId: string): boolean {
    // 排水设施
    if (objectId === 'interaction.drainage_facility_01') {
      const def = findDailyTaskById('daily_drainage_check');
      if (!def) return false;

      const tasks = useDailyTaskStore.getState().tasks;
      const inst = tasks.find((t) => t.taskId === 'daily_drainage_check');
      if (!inst || inst.status !== 'active') {
        this.emitInteractionFeedback(objectId, '请先向巡查员接取排水设施检查任务。');
        return true;
      }

      const currentWeather = useWorldStore.getState().getDisplayWeather();
      if (!isWeatherConditionMet(def, currentWeather)) {
        this.emitInteractionFeedback(objectId, '当前天气不适合检查排水设施。');
        return true;
      }

      // 计入进度
      gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: objectId,
      });
      this.emitInteractionFeedback(objectId, '排水设施检查完成。');
      return true;
    }

    // 暴雨冲散垃圾
    if (objectId === 'interaction.storm_debris_01') {
      const def = findDailyTaskById('daily_storm_waste');
      if (!def) return false;

      const tasks = useDailyTaskStore.getState().tasks;
      const inst = tasks.find((t) => t.taskId === 'daily_storm_waste');
      if (!inst || inst.status !== 'active') {
        this.emitInteractionFeedback(objectId, '请先向巡查员接取暴雨垃圾清理任务。');
        return true;
      }

      const currentWeather = useWorldStore.getState().getDisplayWeather();
      if (!isWeatherConditionMet(def, currentWeather)) {
        this.emitInteractionFeedback(objectId, '当前天气不适合清理暴雨垃圾。');
        return true;
      }

      // 计入进度
      gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: objectId,
      });
      this.emitInteractionFeedback(objectId, '已清理一处暴雨冲散的垃圾。');
      return true;
    }

    // 雾天危险点
    if (objectId === 'interaction.fog_hazard_01' || objectId === 'interaction.fog_hazard_02') {
      const def = findDailyTaskById('daily_fog_hazard_marking');
      if (!def) return false;

      const tasks = useDailyTaskStore.getState().tasks;
      const inst = tasks.find((t) => t.taskId === 'daily_fog_hazard_marking');
      if (!inst || inst.status !== 'active') {
        this.emitInteractionFeedback(objectId, '请先向巡查员接取雾天危险标记任务。');
        return true;
      }

      const currentWeather = useWorldStore.getState().getDisplayWeather();
      if (!isWeatherConditionMet(def, currentWeather)) {
        this.emitInteractionFeedback(objectId, '当前天气不适合标记危险点。');
        return true;
      }

      // 计入进度
      gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: objectId,
      });
      this.emitInteractionFeedback(objectId, '已标记一处雾天危险点。');
      return true;
    }

    return false;
  }

  /**
   * 处理受损环境点交互。
   *
   * 只有任务已接取时才能增加进度。
   * 同一环境点只能计入一次（通过 sourceId 防重复）。
   */
  private handleRestoreAreaInteraction(objectId: string): boolean {
    const def = findDailyTaskById('daily_restore_area');
    if (!def) return false;

    const tasks = useDailyTaskStore.getState().tasks;
    const inst = tasks.find((t) => t.taskId === 'daily_restore_area');
    if (!inst || inst.status !== 'active') {
      this.emitInteractionFeedback(objectId, '请先向林工接取修复受损环境点任务。');
      return true;
    }

    // 计入进度
    gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
      objectiveType: def.objectiveType,
      amount: 1,
      sourceId: objectId,
    });
    this.emitInteractionFeedback(objectId, '已修复一处受损环境点。');
    return true;
  }

  /**
   * 处理生态巡查点交互。
   *
   * 只有任务已接取时才能增加进度。
   * 同一巡查点只能计入一次。
   */
  private handleEcologyPatrolInteraction(objectId: string): boolean {
    const def = findDailyTaskById('daily_ecology_patrol');
    if (!def) return false;

    const tasks = useDailyTaskStore.getState().tasks;
    const inst = tasks.find((t) => t.taskId === 'daily_ecology_patrol');
    if (!inst || inst.status !== 'active') {
      this.emitInteractionFeedback(objectId, '请先向巡查员接取生态巡查任务。');
      return true;
    }

    // 计入进度
    gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', {
      objectiveType: def.objectiveType,
      amount: 1,
      sourceId: objectId,
    });
    this.emitInteractionFeedback(objectId, '已记录一处生态巡查点。');
    return true;
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

    // 更新背景色调 — 使用半透明叠加而非完全覆盖背景图片
    if (this.backgroundRect && this.backgroundRect.scene) {
      this.backgroundRect.setFillStyle(stageConfig.backgroundTint, 0.3);
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

    // recovering 阶段 — 切换为修复后的绿植图片
    const isRecovering = stageConfig.targetAlpha < 0.6;
    zone.updateVisual({
      color: stageConfig.targetColor,
      alpha: stageConfig.targetAlpha,
      scale: stageConfig.targetScale,
      restored: isRecovering,
    });

    // 更新标签 — 在 updateVisual 之后调用，确保操作的是同一有效对象
    if (isRecovering) {
      zone.setLabelText('已清理');
    }
  }

  /**
   * 添加修复后植被装饰。
   * 使用绿植装饰簇图片在修复区域周围放置装饰。
   */
  private addPlaceholderVegetation(): void {
    if (this.vegetationGraphics.length > 0) return;

    const interactionObj = INTERACTION_OBJECTS.find(
      (o) => o.id === POLLUTION_ZONE_INTERACTION_ID,
    );
    if (!interactionObj) return;

    const baseX = interactionObj.x;
    const baseY = interactionObj.y;

    // 使用绿植装饰簇图片在修复区域周围放置装饰
    if (this.textures.exists(DECOR_PLANT_TEXTURE)) {
      const positions = [
        { x: baseX - 50, y: baseY, scale: 0.25 },
        { x: baseX + 40, y: baseY, scale: 0.22 },
        { x: baseX - 10, y: baseY + 10, scale: 0.28 },
      ];

      for (const pos of positions) {
        const veg = this.add.image(pos.x, pos.y, DECOR_PLANT_TEXTURE);
        veg.setScale(pos.scale);
        veg.setOrigin(0.5, 1); // 底部对齐地面
        veg.setAlpha(0.85);
        veg.setDepth(DEPTH.objects);
        this.interactiveLayer.add(veg);
        this.vegetationGraphics.push(veg);
      }
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
    const { timeSnapshot, weatherSnapshot, devWeatherPreview } = useWorldStore.getState();
    this.applyDayPhase(timeSnapshot.phase);
    // 预览优先
    this.applyWeatherVisual(devWeatherPreview ?? weatherSnapshot.weather);

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

      // 开发天气预览变化 — 不影响正式天气时间线
      if (state.devWeatherPreview !== this.currentDevWeatherPreview) {
        this.currentDevWeatherPreview = state.devWeatherPreview;
        const displayWeather = state.devWeatherPreview ?? state.weatherSnapshot.weather;
        this.applyWeatherVisual(displayWeather);
        gameBridge.emit('DEV_WEATHER_PREVIEW', { weather: state.devWeatherPreview });
        // 预览退出时恢复正式天气
        if (state.devWeatherPreview === null) {
          gameBridge.emit('WEATHER_CHANGED_V2', {
            previousWeather: null,
            current: state.weatherSnapshot,
          });
        }
        // 刷新每日任务天气条件
        useDailyTaskStore.getState().refreshWeatherConditions();
      }

      // 天气变化（仅非预览时更新视觉）
      if (
        state.devWeatherPreview === null &&
        state.weatherSnapshot.weather !== this.currentWeatherType
      ) {
        const prevWeather = this.currentWeatherType;
        this.applyWeatherVisual(state.weatherSnapshot.weather);
        gameBridge.emit('WEATHER_CHANGED_V2', {
          previousWeather: prevWeather,
          current: state.weatherSnapshot,
        });
        // 刷新每日任务天气条件
        useDailyTaskStore.getState().refreshWeatherConditions();
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
    // 更新天气门控交互对象的可见性和可交互性
    this.updateWeatherGatedObjects(weather);
  }

  /**
   * 更新天气条件交互对象的可见性和可交互性。
   *
   * 三层天气门控的第 1、2 层：
   * 1. 非 heavy_rain 时隐藏暴雨垃圾对象；
   * 2. 非 heavy_rain 时禁用其交互区域和交互提示；
   *    非 light_rain/heavy_rain 时隐藏排水设施交互；
   *    非 fog 时隐藏雾天危险点。
   *
   * 第 3 层（Store 校验）在 dailyTaskStore.applyProgress 中完成。
   */
  private updateWeatherGatedObjects(weather: WeatherType): void {
    if (this.isShutdown || this.cleanupCompleted) return;

    for (const zone of this.interactionZones) {
      if (zone.isDestroyed) continue;
      const config = zone.config;
      if (!this.weatherGatedObjectIds.has(config.id)) continue;

      // 暴雨垃圾仅在 heavy_rain 下可见和可交互
      if (config.id === 'interaction.storm_debris_01') {
        const visible = weather === 'heavy_rain';
        const gameObject = zone.getGameObject();
        if (gameObject && gameObject.scene) {
          gameObject.setVisible(visible);
          gameObject.setActive(visible);
        }
        if (!visible) {
          zone.forceUnavailable();
        }
        // visible 时不需要额外操作 — checkAvailability 会自动恢复
      }

      // 雾天危险点仅在 fog 下可见和可交互
      if (config.id === 'interaction.fog_hazard_01' || config.id === 'interaction.fog_hazard_02') {
        const visible = weather === 'fog';
        const gameObject = zone.getGameObject();
        if (gameObject && gameObject.scene) {
          gameObject.setVisible(visible);
          gameObject.setActive(visible);
        }
        if (!visible) {
          zone.forceUnavailable();
        }
      }

      // 排水设施在 light_rain 或 heavy_rain 下可交互
      // 视觉上始终可见，但交互提示在天气不匹配时不显示
      // 交互禁用在 updateInteractions 中通过 weatherGatedObjectIds 检查
    }
  }
}

export { SCENE_KEY as URBAN_WASTELAND_SCENE_KEY };
