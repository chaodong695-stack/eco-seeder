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
 *
 * 2.5D 改造（主游戏界面视觉改造执行规范 §1–§11）：
 * - 七层 Parallax 图层（sky/far/mid/ground/gameplay/foreground/effects）；
 * - 玩法实体（玩家/NPC/交互物/植被）保持直接挂场景根，确保 Y-sort 深度生效；
 * - scrollFactor 统一在 PARALLAX 中定义，禁止散落调整。
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
  WALKABLE_Y_MIN,
  WALKABLE_Y_MAX,
  PLAYER_SIZE,
} from '../config/movementConfig';
import {
  DEPTH_BACKGROUND,
  DEPTH_FAR,
  DEPTH_DECOR,
  DEPTH_GROUND,
  DEPTH_OBSTACLE,
  DEPTH_ENTITY_BASE,
  DEPTH_FOREGROUND,
  DEPTH_ENTITY_LABEL,
  DEPTH_FX,
  DEPTH_UI,
  entityDepth,
} from '../config/depthConfig';
import {
  PARALLAX,
  FAR_HORIZON_Y,
  MID_BOTTOM_Y,
  FOREGROUND_ANCHOR_Y,
} from '../config/parallaxConfig';
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
import { STAGE_ONE_VISUALS } from '@/game/visual/stageOneVisualPolicy';
import { DECOR_PLACEMENTS, MID_LAYER_PLACEMENT } from '@/content/maps/urbanWastelandLayout';
import { resolveFocus } from '@/game/visual/labelPolicy';
import { TaskMarker } from '@/game/visual/TaskMarker';
import { shouldLoad } from '@/game/assets/assetLoadPolicy';
import { createRepairMapContext, REMOTE_REPAIR_SCENE_KEY } from '@/game/session/repairMapTransition';
import { isRemoteDamagedEnvironment, remoteInteractionVisual } from '@/game/visual/remoteInteractionPolicy';
import { foregroundPolicy } from '@/game/visual/foregroundPolicy';

const SCENE_KEY = V0_1_MAIN_MAP_IDENTITY.sceneKey;

/** 场景纹理 key 常量 — 2.5D 改造：分层背景统一命名。 */
const SKY_TEXTURE = 'wasteland-sky';
const FAR_CITY_TEXTURE = 'wasteland-far-city';
const MID_BUILDINGS_TEXTURE = 'wasteland-mid-buildings';
const GROUND_OVERLAY_TEXTURE = 'wasteland-ground';
const FOREGROUND_TEXTURE = 'wasteland-foreground';
const GROUND_TILE_TEXTURE = 'scene-tile-cracked-ground';
const DECOR_PLANT_TEXTURE = 'scene-decor-ruin-plant';

/** NPC 立绘纹理 key — 按 NPC ID 映射。 */
const NPC_TEXTURE_KEYS: Record<string, string> = {
  'npc.engineer.lin': 'npc-lin-gong-side',
  'npc_weather_ranger': 'npc-patrol-inspector-side',
};

/** NPC 立绘显示高度（像素）。 */
const NPC_DISPLAY_HEIGHT = 120;

/** 静态障碍物配置 — 碰撞区域与视觉轮廓一致。
 * 2.5D 改造：障碍物分布在可行走纵深带 [WALKABLE_Y_MIN, WALKABLE_Y_MAX] 内。
 */
interface ObstacleConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

const OBSTACLES: ObstacleConfig[] = [
  { x: 350, y: 780, width: 160, height: 90, color: 0x1a3538 },
  { x: 900, y: 760, width: 200, height: 100, color: 0x152a2d },
  { x: 1500, y: 800, width: 180, height: 95, color: 0x1f3a3e },
  { x: 700, y: 960, width: 140, height: 80, color: 0x1a3538 },
];

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
  // ── 2.5D 七层图层容器（规范 §2） ──
  /** 天空层（scrollFactor 0.05）。 */
  private skyLayer!: Phaser.GameObjects.Container;
  /** 远景层 — 远景厂区/烟囱/塔架（scrollFactor 0.20）。 */
  private farLayer!: Phaser.GameObjects.Container;
  /** 中景层 — 废墟/厂房/管线/电杆（scrollFactor 0.48）。 */
  private midLayer!: Phaser.GameObjects.Container;
  /** 地面层 — 路面 + 障碍物理体（scrollFactor 1.0）。 */
  private groundLayer!: Phaser.GameObjects.Container;
  /** 前景层 — 草丛/管道/废墟遮挡（scrollFactor 1.10）。 */
  private foregroundLayer!: Phaser.GameObjects.Container;

  private player!: Player;
  private obstacles: Phaser.Physics.Arcade.StaticGroup = undefined!;
  private interactionZones: InteractionZone[] = [];
  private npcEntities: NpcEntity[] = [];

  /** 色调叠加矩形引用 — 用于视觉阶段变化（位于 sky 之上、far 之下）。 */
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
  private focusCanInteract = false;
  private taskMarkers = new Map<string, TaskMarker>();

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
   * 2.5D 改造（规范 §10）：分层背景 5 个纹理进入 sceneAssets.backgrounds。
   *
   * 单个纹理加载失败不中断整个 preload — Phaser 会在 loaderror 事件中记录，
   * create() 中通过 `this.textures.exists(key)` 防御性检查并回退到占位图形。
   */
  preload(): void {
    // 2.5D 分层背景（占位素材，正式美术阶段按 §13 顺序逐张替换）
    this.load.image(SKY_TEXTURE, sceneAssets.backgrounds.sky);
    if (shouldLoad('optional', this.scale.width)) {
      this.load.image(FAR_CITY_TEXTURE, sceneAssets.backgrounds.farCity);
      this.load.image(MID_BUILDINGS_TEXTURE, sceneAssets.backgrounds.midBuildings);
    }
    this.load.image(GROUND_OVERLAY_TEXTURE, sceneAssets.backgrounds.ground2_5d);
    this.load.image(FOREGROUND_TEXTURE, sceneAssets.backgrounds.foreground);

    // 地面平铺纹理（保留作为 ground 层的核心细节）
    this.load.image(GROUND_TILE_TEXTURE, sceneAssets.tiles.crackedGround);

    // 绿植装饰簇（NPC 周围、修复区域周围分布）
    if (shouldLoad('optional', this.scale.width)) {
      this.load.image(DECOR_PLANT_TEXTURE, sceneAssets.decor.ruinPlantCluster);
    }

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

    // 设置物理世界边界 — 2.5D 纵深带：
    // 玩家脚底（origin 0.5,1 时 body 顶边约为脚底上方 PLAYER_SIZE.height）限制在
    // [WALKABLE_Y_MIN, WALKABLE_Y_MAX]，玩家无法走进背景"天上"。
    // 边界按碰撞体计算：body 顶边 = 脚底 y - PLAYER_SIZE.height。
    this.physics.world.setBounds(
      0,
      WALKABLE_Y_MIN - PLAYER_SIZE.height,
      W,
      WALKABLE_Y_MAX - WALKABLE_Y_MIN + PLAYER_SIZE.height,
    );

    // ── 创建七层图层容器（规范 §2） ──
    this.skyLayer = this.add.container(0, 0).setDepth(DEPTH_BACKGROUND).setScrollFactor(PARALLAX.sky);
    this.farLayer = this.add.container(0, 0).setDepth(DEPTH_FAR).setScrollFactor(PARALLAX.far);
    this.midLayer = this.add.container(0, 0).setDepth(DEPTH_DECOR).setScrollFactor(PARALLAX.mid);
    this.groundLayer = this.add.container(0, 0).setDepth(DEPTH_GROUND).setScrollFactor(PARALLAX.ground);
    // 玩法层（scrollFactor 1.0）— 容器为组织用，实体仍直接挂场景根以保证 Y-sort 生效。
    this.add.container(0, 0).setDepth(DEPTH_ENTITY_BASE).setScrollFactor(PARALLAX.gameplay);
    this.foregroundLayer = this.add.container(0, 0).setDepth(DEPTH_FOREGROUND).setScrollFactor(PARALLAX.foreground);
    // 特效层（depth 3000）— 昼夜/天气控制器的预留挂载点；当前控制器在场景根直接添加。
    this.add.container(0, 0).setDepth(DEPTH_FX).setScrollFactor(1);

    // ── 第 0 层：天空 ──
    if (this.textures.exists(SKY_TEXTURE)) {
      const sky = this.add.image(W / 2, H / 2, SKY_TEXTURE);
      // cover 缩放：覆盖世界宽（横向视差 ±640 → 32px 内偏移，纵向 ±360 → 18px 偏移）
      const scale = Math.max(W / sky.width, H / sky.height);
      sky.setScale(scale);
      this.skyLayer.add(sky);
    } else {
      // 回退：浅灰蓝纯色背景
      this.skyLayer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x9fb4c4));
    }
    // 视觉阶段 tint 矩形（位于 sky 之上、far 之下；与各 far/mid 平行，仅压暗天空色温）
    this.backgroundRect = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0);
    this.skyLayer.add(this.backgroundRect);

    // ── 第 1 层：远景厂区/烟囱/塔架 ──
    if (this.textures.exists(FAR_CITY_TEXTURE)) {
      const far = this.add.image(W / 2, FAR_HORIZON_Y, FAR_CITY_TEXTURE);
      far.setOrigin(0.5, 1); // 建筑底部对齐地平线
      this.farLayer.add(far);
    } else if (DEBUG_HITBOX) {
      // 调试占位：浅灰矩形条带
      this.farLayer.add(this.add.rectangle(W / 2, FAR_HORIZON_Y, W, 200, 0xa8adb5, 0.6).setOrigin(0.5, 1));
    }

    // ── 第 2 层：中景废墟/管线/电杆 ──
    if (this.textures.exists(MID_BUILDINGS_TEXTURE)) {
      const mid = this.add.image(MID_LAYER_PLACEMENT.x, MID_LAYER_PLACEMENT.baseY, MID_BUILDINGS_TEXTURE);
      mid.setOrigin(0.5, 1);
      mid.setAlpha(STAGE_ONE_VISUALS.midAlpha);
      mid.setScrollFactor(MID_LAYER_PLACEMENT.scrollX, MID_LAYER_PLACEMENT.scrollY);
      this.midLayer.add(mid);
    } else if (DEBUG_HITBOX) {
      this.midLayer.add(this.add.rectangle(W / 2, MID_BOTTOM_Y, W, 260, 0x5a6b63, 0.6).setOrigin(0.5, 1));
    }

    // ── 第 3 层：地面 + 障碍物（scrollFactor=1） ──
    const GROUND_BAND_HEIGHT = WORLD_BOUNDS.height - WALKABLE_Y_MIN;
    if (this.textures.exists(GROUND_TILE_TEXTURE)) {
      const groundTile = this.add.tileSprite(
        W / 2,
        WALKABLE_Y_MIN + GROUND_BAND_HEIGHT / 2,
        W,
        GROUND_BAND_HEIGHT,
        GROUND_TILE_TEXTURE,
      );
      this.groundLayer.add(groundTile);
    } else {
      this.groundLayer.add(
        this.add.rectangle(
          W / 2,
          WALKABLE_Y_MIN + GROUND_BAND_HEIGHT / 2,
          W,
          GROUND_BAND_HEIGHT,
          0x2a3535,
        ),
      );
    }
    // 2.5D 地面覆盖图（占位阶段；正式美术阶段如启用此图可去掉 tileSprite）
    if (this.textures.exists(GROUND_OVERLAY_TEXTURE)) {
      const groundOverlay = this.add.image(W / 2, 0, GROUND_OVERLAY_TEXTURE);
      groundOverlay.setOrigin(0.5, 0);
      // 与 tileSprite 等高（从 WALKABLE_Y_MIN 起到世界底）
      const overlayScale = GROUND_BAND_HEIGHT / groundOverlay.height;
      groundOverlay.setScale(overlayScale);
      groundOverlay.y = WALKABLE_Y_MIN;
      this.groundLayer.add(groundOverlay);
    }

    // ── 障碍物 — 仅 DEBUG_HITBOX 时显示可视化矩形（scrollFactor 跟随 ground 容器 = 1） ──
    this.obstacles = this.physics.add.staticGroup();
    for (const obs of OBSTACLES) {
      const rect = this.add.rectangle(obs.x, obs.y, obs.width, obs.height, obs.color);
      rect.setDepth(DEPTH_OBSTACLE);
      rect.setAlpha(DEBUG_HITBOX ? 0.6 : 0);
      this.groundLayer.add(rect);
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(obs.width, obs.height);
      body.updateFromGameObject();
      this.obstacles.add(rect);
    }

    // ── 第 5 层：前景遮挡 ──
    if (this.textures.exists(FOREGROUND_TEXTURE)) {
      const fg = this.add.image(W / 2, FOREGROUND_ANCHOR_Y, FOREGROUND_TEXTURE);
      fg.setOrigin(0.5, 1);
      const policy = foregroundPolicy(W);
      fg.setAlpha(policy.alpha);
      fg.setDepth(DEPTH_FOREGROUND);
      fg.setScrollFactor(1); // 底边对齐锚点
      this.foregroundLayer.add(fg);
    } else if (DEBUG_HITBOX) {
      this.foregroundLayer.add(
        this.add.rectangle(140, H - 100, 280, 400, 0x3a3f44, 0.6),
      );
      this.foregroundLayer.add(
        this.add.rectangle(W - 140, H - 100, 280, 400, 0x3a3f44, 0.6),
      );
    }

    // 绿植装饰簇 — 场景装饰，不参与任务判定
    this.createDecorPlants();

    // ── 玩家 — 站立在可行走纵深带中部 ──
    const character = usePlayerStore.getState().character;
    const gender = character?.gender;
    // 玩家脚底对齐纵深带中部；直接挂场景根（不放入任何 Container，保证 Y-sort 生效）
    this.player = new Player(this, W / 2, (WALKABLE_Y_MIN + WALKABLE_Y_MAX) / 2, '生态修复员', gender ?? undefined);

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
      .setDepth(DEPTH_UI);
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
      .setDepth(DEPTH_UI);

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
    // 2.5D Y-sort 刷新（规范 §7）：玩家/NPC 脚底 y 决定深度，保证环境能正确遮挡。
    // Player 内部已在 updateMovement 中刷新；此处统一刷新 NPC 视觉对象（静态，幂等）。
    this.refreshEntityDepths();
  }

  /**
   * 刷新所有 Gameplay 层实体的 Y-sort 深度（规范 §7）。
   *
   * 玩家视觉对象：Player.updateMovement 已每帧刷新。
   * NPC 视觉对象：位置固定，但保留此方法以便未来 NPC 移动时无需修改 update。
   * 植被 / 交互物：自身 updateDepth() 在 create 时已设置，运行时位置不变，无需每帧刷新。
   */
  private refreshEntityDepths(): void {
    if (this.isShutdown || this.cleanupCompleted) return;
    for (const npc of this.npcEntities) {
      const obj = npc.gameObject;
      if (obj && obj.scene) {
        obj.setDepth(entityDepth(obj.y));
      }
    }
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
    for (const marker of this.taskMarkers.values()) marker.destroy();
    this.taskMarkers.clear();
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

  /**
   * 创建绿植装饰簇 — 使用真实图片素材布置在场景适当位置。
   * 只作为装饰，不参与任务判定。
   * 2.5D 改造：分布到可行走纵深带内错落站位，参与 Y-sort 遮挡；
   * 直接挂场景根。
   */
  private createDecorPlants(): void {
    if (!this.textures.exists(DECOR_PLANT_TEXTURE)) return;

    // 带内错落分布（前中后排），底部对齐
    const positions = DECOR_PLACEMENTS.filter((p) => p.enabled).map((p) => ({ x: p.x, y: p.baseY, scale: Math.min(0.32, p.visibleHeight / 500) }));

    for (const pos of positions) {
      const plant = this.add.image(pos.x, pos.y, DECOR_PLANT_TEXTURE);
      plant.setScale(pos.scale);
      plant.setOrigin(0.5, 1); // 底部对齐
      plant.setDepth(entityDepth(pos.y)); // Y-sort
      plant.setAlpha(0.7);
    }
  }

  private markerKind(type: string): 'repair' | 'inspect' | 'patrol' | 'hazard' {
    if (type === 'damaged_environment' || type === 'restoration_zone') return 'repair';
    if (type === 'ecology_patrol_point') return 'patrol';
    if (type === 'fog_hazard_point') return 'hazard';
    return 'inspect';
  }

  private createInteractionObjects(): void {
    for (const config of INTERACTION_OBJECTS) {
      const zone = new InteractionZone(this, config);
      if (isRemoteDamagedEnvironment(config.id)) {
        const visual = remoteInteractionVisual(config);
        const gameObject = zone.getGameObject();
        if (gameObject) {
          gameObject.setScale(visual.scale);
          gameObject.setAlpha(visual.alpha);
          gameObject.setDepth(entityDepth(config.y));
          gameObject.setScrollFactor(1);
          zone.setVisualVisible(true);
        }
      }
      // Y-sort 深度（构造器内已设置，此处显式调用以保证一致）
      zone.updateDepth();
      this.interactionZones.push(zone);
      const kind = this.markerKind(config.type);
      const marker = new TaskMarker(this);
      marker.setState(config.x, config.y - config.height / 2 - 14, kind, false, 0);
      marker.setVisible(zone.visualVisible);
      this.taskMarkers.set(config.id, marker);
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
      // 直接挂场景根 + Y-sort 深度（不放入 Container，保证深度排序生效）
      visualObj.setDepth(entityDepth(config.y));

      // 物理体 — 使用不可见矩形用于距离检测，不阻挡玩家
      const physBody = this.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        0x000000,
        0,
      );
      physBody.setDepth(DEPTH_OBSTACLE);
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
      label.setDepth(DEPTH_ENTITY_LABEL);
      label.setVisible(false);

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
    const candidates = [] as Array<{ id: string; distance: number; range: number; eligible: boolean; priority: number }>;
    let pollutionZoneInRange = false;

    for (const zone of this.interactionZones) {
      zone.checkAvailability(playerX, playerY);
      const dx = playerX - zone.config.x;
      const dy = playerY - zone.config.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const weatherEligible = zone.config.id !== 'interaction.drainage_facility_01'
        || currentWeather === 'light_rain' || currentWeather === 'heavy_rain';
      const fogEligible = !zone.config.id.startsWith('interaction.fog_hazard_') || currentWeather === 'fog';
      const eligible = zone.available && weatherEligible && fogEligible;
      candidates.push({ id: zone.config.id, distance, range: zone.config.interactionRange, eligible, priority: zone.config.id === POLLUTION_ZONE_INTERACTION_ID ? 1 : 0 });
      if (zone.available && zone.config.id === POLLUTION_ZONE_INTERACTION_ID) pollutionZoneInRange = true;
    }
    this.restorationController?.setInRange(pollutionZoneInRange);

    for (const npc of this.npcEntities) {
      const dx = playerX - npc.config.x;
      const dy = playerY - npc.config.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wasAvailable = npc.isAvailable;
      npc.isAvailable = distance <= npc.config.interactionRange;
      if (npc.isAvailable !== wasAvailable) {
        gameBridge.emit(npc.isAvailable ? 'INTERACTION_AVAILABLE' : 'INTERACTION_UNAVAILABLE', npc.isAvailable
          ? { objectId: npc.config.id, displayName: npc.config.displayName, type: 'npc_placeholder', hint: '? E ??' }
          : { objectId: npc.config.id });
      }
      candidates.push({ id: npc.config.id, distance, range: npc.config.interactionRange, eligible: npc.isAvailable, priority: 2 });
    }

    const focus = resolveFocus(candidates, this.nearestInteractionId);
    const previousId = this.nearestInteractionId;
    this.nearestInteractionId = focus.id;
    this.focusCanInteract = focus.canInteract;
    const focusedNpc = this.npcEntities.find((npc) => npc.config.id === focus.id);
    this.nearestIsNpc = Boolean(focusedNpc);
    this.nearestNpcId = focusedNpc?.config.id ?? null;

    for (const zone of this.interactionZones) {
      zone.setLabelVisible(zone.config.id === focus.id);
      const marker = this.taskMarkers.get(zone.config.id);
      if (marker) {
        marker.setState(zone.config.x, zone.config.y - zone.config.height / 2 - 14, this.markerKind(zone.config.type), zone.config.id === focus.id, 0);
        marker.setVisible(zone.visualVisible);
      }
    }
    for (const npc of this.npcEntities) npc.label.setVisible(npc.config.id === focus.id && !useUIStore.getState().isNpcDialogOpen);

    if (focus.id && focus.id !== previousId && focus.canInteract) {
      const npc = this.npcEntities.find((item) => item.config.id === focus.id);
      const zone = this.interactionZones.find((item) => item.config.id === focus.id);
      gameBridge.emit('INTERACTION_AVAILABLE', npc
        ? { objectId: npc.config.id, displayName: npc.config.displayName, type: 'npc_placeholder', hint: '? E ??' }
        : { objectId: zone!.config.id, displayName: zone!.config.displayName, type: zone!.config.type, hint: '? E ??' });
    } else if (!focus.id && previousId) {
      gameBridge.emit('INTERACTION_UNAVAILABLE', { objectId: previousId });
    }

    // Phaser ????????????React InteractionPrompt ???????
    this.interactionHintText.setVisible(false);
    if (this.restorationController) {
      const status = this.restorationController.getStatus();
      if ((status === 'in_progress' || status === 'interrupted') && focus.id === POLLUTION_ZONE_INTERACTION_ID) {
        this.interactionHintText.setText(this.restorationController.getInteractionHint());
      }
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
    if (this.inputMode !== 'gameplay' || !this.focusCanInteract) return;

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
      this.openRepairMap(this.nearestInteractionId);
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

  private openRepairMap(objectId: string): void {
    if (!isRemoteDamagedEnvironment(objectId) || this.scene.isPaused()) return;
    const player = this.player?.gameObject;
    if (!player) return;
    createRepairMapContext(SCENE_KEY, objectId, { x: player.x, y: player.y });
    this.scene.launch(REMOTE_REPAIR_SCENE_KEY);
    this.scene.pause();
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
        veg.setDepth(entityDepth(pos.y)); // Y-sort，直接挂场景根
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
        zone.setVisualVisible(visible);
        if (!visible) {
          zone.forceUnavailable();
        }
        // visible 时不需要额外操作 — checkAvailability 会自动恢复
      }

      // 雾天危险点仅在 fog 下可见和可交互
      if (config.id === 'interaction.fog_hazard_01' || config.id === 'interaction.fog_hazard_02') {
        const visible = weather === 'fog';
        zone.setVisualVisible(visible);
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
