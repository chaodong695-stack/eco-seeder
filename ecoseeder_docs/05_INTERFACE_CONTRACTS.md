# 接口契约与扩展规范

## 1. 文档目的

本文件定义模块之间的稳定接口。任何影响接口的修改必须：

1. 更新本文件；
2. 更新类型定义；
3. 增加或修改测试；
4. 在 PR 描述中说明兼容性；
5. 必要时提升接口版本。

---

## 2. 通用约定

所有实体必须包含：

```ts
interface BaseEntity {
  id: string;
  version: number;
  tags?: string[];
}
```

ID 命名建议：

```text
map.urban_wasteland
task.daily.clear_drain
dungeon.rescue_hedgehog
npc.maintenance_master
reward.seed.rare_cotton
version.v0_1_mvp
```

禁止使用中文作为内部 ID。

---

## 3. 地图接口

### 3.1 地图定义

地图的程序 ID、场景键、玩家可见名称、主题类型和主要区域必须明确区分，不得将其理解为多张不同地图。

```ts
interface MapDefinition extends BaseEntity {
  /**
   * 玩家在界面中看到的正式地图名称。
   *
   * v0.1 固定为：雾港旧工业区
   */
  displayName: string;

  /**
   * 地图主题分类。
   *
   * v0.1 使用 urban_wasteland，
   * 对应中文概念“城市污染荒地”。
   *
   * 该字段是分类，不是另一张地图名称。
   */
  type: MapType;

  /**
   * 地图背景和玩法定位说明。
   */
  description: string;

  /**
   * Phaser 场景注册键。
   *
   * v0.1 固定为：UrbanWastelandScene
   */
  sceneKey: string;

  /**
   * 地图中的主要可玩区域 ID。
   *
   * v0.1 固定为：
   * region.industrial_wetland_restoration
   */
  primaryRegionId: string;

  /**
   * 地图采用的气候配置。
   */
  climateProfileId: string;

  /**
   * 地图包含的全部区域。
   *
   * regions 中必须存在一个 id 与 primaryRegionId 相同的区域。
   */
  regions: MapRegionDefinition[];

  /**
   * 新存档或地图首次加载时使用的初始环境状态。
   */
  initialState: MapState;

  /**
   * 日常任务池。
   */
  dailyTaskPoolIds: string[];

  /**
   * 随机任务或随机事件池。
   */
  randomTaskPoolIds: string[];

  /**
   * 副本与特殊事件池。
   *
   * v0.1 包含：
   * - 受伤动物救助完整副本；
   * - 暴雨垃圾扩散简化演示；
   * - 地下排水站简化演示。
   */
  dungeonPoolIds: string[];

  /**
   * 当前地图可投放的 NPC 池。
   */
  npcPoolIds: string[];

  /**
   * 地图通用奖励池。
   */
  rewardPoolId: string;

  /**
   * 地图解锁条件。
   */
  unlockCondition?: ConditionExpression;
}
```

`MapDefinition` 继承的 `BaseEntity.id` 直接作为地图 ID 使用，不再单独定义 `mapId`。

v0.1 的地图身份固定为：
| 字段 | 固定值 | 含义 |
|---|---|---|
| `id` | `map.urban_wasteland` | 程序内部地图 ID |
| `sceneKey` | `UrbanWastelandScene` | Phaser 场景注册键 |
| `displayName` | `雾港旧工业区` | 玩家看到的正式地图名称 |
| `type` | `urban_wasteland` | 地图主题分类，对应“城市污染荒地” |
| `primaryRegionId` | `region.industrial_wetland_restoration` | 主要可玩区域 ID |

主要区域的玩家可见名称固定为：

```text
废弃工业湿地修复区
```

因此：

* “雾港旧工业区”是地图名称；
* “城市污染荒地”是地图主题分类；
* “废弃工业湿地修复区”是地图内部区域；
* 三者不得被实现为三张独立地图。

### 3.2 v0.1 地图身份常量

实现阶段建议使用统一常量，禁止在多个组件中重复硬编码地图名称。

```ts
const V0_1_MAIN_MAP_IDENTITY = {
  id: "map.urban_wasteland",
  sceneKey: "UrbanWastelandScene",
  displayName: "雾港旧工业区",
  type: "urban_wasteland",
  primaryRegionId: "region.industrial_wetland_restoration",
} as const;
```

该常量用于说明 v0.1 的固定配置，不代表 `MapDefinition` 只能支持一张地图。后续版本新增地图时，应创建新的 `MapDefinition` 数据，而不是修改本接口结构。

### 3.3 地图区域要求

`MapRegionDefinition` 中应通过 `id` 和 `displayName` 区分区域标识与玩家可见名称。

如现有 `MapRegionDefinition` 尚未包含 `displayName`，应调整为：

```ts
interface MapRegionDefinition extends BaseEntity {
  /**
   * 玩家看到的区域名称。
   */
  displayName: string;

  /**
   * 区域功能或环境说明。
   */
  description: string;

  /**
   * 区域类型。
   */
  type: MapRegionType;

  /**
   * 区域边界、碰撞区或交互范围配置。
   */
  bounds: RegionBounds;

  /**
   * 区域内可使用的交互点。
   */
  interactionPointIds: string[];
}
```

v0.1 主要区域的配置关系为：

```ts
const PRIMARY_REGION_ID =
  "region.industrial_wetland_restoration";

const PRIMARY_REGION_DISPLAY_NAME =
  "废弃工业湿地修复区";
```

`MapDefinition.primaryRegionId` 必须指向 `regions` 中该区域的 `id`，不能直接保存中文名称。

### 3.4 地图环境状态

```ts
interface MapState {
  /**
   * 空气污染程度，0—100，数值越高表示污染越严重。
   */
  airPollution: number;

  /**
   * 水体污染程度，0—100，数值越高表示污染越严重。
   */
  waterContamination: number;

  /**
   * 土壤毒性，0—100，数值越高表示污染越严重。
   */
  soilToxicity: number;

  /**
   * 固体废物累积程度，0—100，数值越高表示垃圾越多。
   */
  solidWaste: number;

  /**
   * 排水能力，0—100，数值越高表示排水能力越好。
   */
  drainageCapacity: number;

  /**
   * 栖息地安全程度，0—100，数值越高表示越安全。
   */
  habitatSafety: number;

  /**
   * 基础设施安全程度，0—100，数值越高表示越安全。
   */
  infrastructureSafety: number;

  /**
   * 公众支持程度，0—100，数值越高表示支持度越高。
   */
  publicSupport: number;

  /**
   * 植被恢复程度，0—100，数值越高表示植被越丰富。
   */
  vegetation: number;

  /**
   * 生物多样性水平，0—100，数值越高表示多样性越高。
   */
  biodiversity: number;

  /**
   * 人类或环境扰动程度，0—100，数值越高表示扰动越严重。
   */
  disturbance: number;

  /**
   * 捕食者或其他动物风险，0—100，数值越高表示风险越高。
   */
  predatorRisk: number;

  /**
   * 动物救助响应效率，0—100，数值越高表示救助速度越快。
   */
  rescueSpeed: number;

  /**
   * 野生动物可获得的自然食物水平，
   * 0—100，数值越高表示自然食物越充足。
   */
  naturalFood: number;
}
```

所有数值在写入状态前必须限制在 `0—100` 范围内。

### 3.5 地图视觉阶段

地图视觉阶段是根据 `MapState` 计算得到的派生状态，不单独作为第二套环境状态持久化。

```ts
type MapVisualStage =
  | "polluted"
  | "restoring"
  | "restored";
```

v0.1 正式实现：

```text
polluted
restoring
```

`restored` 仅作为后续版本扩展状态保留。

可以通过综合修复分数推导视觉阶段：

```ts
function getMapVisualStage(
  state: MapState
): MapVisualStage {
  const pollutionScore =
    state.airPollution +
    state.waterContamination +
    state.soilToxicity +
    state.solidWaste +
    state.disturbance;

  const recoveryScore =
    state.drainageCapacity +
    state.habitatSafety +
    state.infrastructureSafety +
    state.publicSupport +
    state.vegetation +
    state.biodiversity;

  const normalizedScore =
    (recoveryScore / 6) -
    (pollutionScore / 5);

  if (normalizedScore < 0) {
    return "polluted";
  }

  if (normalizedScore < 50) {
    return "restoring";
  }

  return "restored";
}
```

以上函数用于说明派生关系。正式实现时可以调整权重，但必须满足：

* `airPollution` 等污染指标升高时，环境状态不能变好；
* `vegetation` 等恢复指标升高时，环境状态不能变差；
* v0.1 不得将 `visualStage` 与 `MapState` 分别存储后独立修改；
* v0.1 的正式流程只需要达到 `restoring`。

---

## 4. 天气接口

### 4.1 天气配置与时间线（DEV-05 实现）

```ts
type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
type TimeMode = 'realtime' | 'demo';
type DemoTimePreset = DayPhase;

interface WorldTimeSnapshot {
  mode: TimeMode;
  localDate: string; // YYYY-MM-DD
  localMinutes: number; // 0–1439
  timezoneOffsetMinutes: number;
  phase: DayPhase;
  demoPreset: DemoTimePreset | null;
}

type WeatherType = 'clear' | 'overcast' | 'light_rain' | 'heavy_rain' | 'fog';

interface WeatherDefinition {
  type: WeatherType;
  displayName: string;
  intensity: number;
  visibility: number;
  ambientTint: number;
  overlayAlpha: number;
  particleProfile: string | null;
}

interface WeatherProfile {
  id: string;
  mapId: string;
  supportedWeather: WeatherType[];
  baseWeights: Record<WeatherType, number>;
  transitionWeights: Partial<Record<WeatherType, Partial<Record<WeatherType, number>>>>;
}

interface WeatherTimelineEntry {
  id: string;
  startMinute: number;
  endMinute: number;
  weather: WeatherType;
  intensity: number;
}

interface WeatherTimeline {
  date: string;
  mapId: string;
  seed: string;
  entries: WeatherTimelineEntry[];
}

interface WeatherSnapshot {
  date: string;
  mapId: string;
  weather: WeatherType;
  displayName: string;
  intensity: number;
  visibility: number;
  timelineEntryId: string;
}
```

DEV-05 暴露只读能力供 DEV-06 使用：
```ts
getCurrentWorldTime(): WorldTimeSnapshot
getCurrentWeather(): WeatherSnapshot
getWeatherTimeline(): WeatherTimeline | null
```

### 4.2 原始天气接口（规范保留）

```ts
interface WeatherProfile extends BaseEntity {
  mapTypes: MapType[];
  seasonalBias: Record<string, number>;
  weatherWeights: Record<WeatherType, number>;
  transitionRules: WeatherTransitionRule[];
}
```

```ts
interface WeatherSegment {
  id: string;
  type: WeatherType;
  startMinute: number;
  endMinute: number;
  intensity: number;
  modifiers: RuleModifier[];
}
```

```ts
interface WeatherTimeline {
  gameDay: string;
  seed: string;
  segments: WeatherSegment[];
}
```

天气生成器：

```ts
interface WeatherService {
  generateTimeline(input: WeatherGenerationInput): WeatherTimeline;
  getCurrentSegment(timeline: WeatherTimeline, now: Date): WeatherSegment;
}
```

---

## 5. 任务接口

```ts
interface TaskDefinition extends BaseEntity {
  name: string;
  category: "daily" | "random" | "npc";
  mapTypes: MapType[];
  regionIds?: string[];
  triggerCondition?: ConditionExpression;
  baseWeight: number;
  cooldownDays?: number;
  objectives: TaskObjective[];
  resultRules: ResultRule[];
  rewardIds: string[];
  agentContextId?: string;
}
```

任务实例：

```ts
interface TaskInstance {
  instanceId: string;
  definitionId: string;
  status: "available" | "accepted" | "active" | "completed" | "failed";
  generatedAt: string;
  parameters: Record<string, unknown>;
  progress: Record<string, number>;
}
```

任务生成：

```ts
interface TaskService {
  generateDailyTasks(input: TaskGenerationInput): TaskInstance[];
  generateRandomTasks(input: TaskGenerationInput): TaskInstance[];
  completeTask(input: CompleteTaskInput): ActionResult;
}
```

---

## 6. NPC 接口

```ts
interface NpcDefinition extends BaseEntity {
  name: string;
  role: NpcRole;
  sceneAssetId: string;
  mapIds: string[];
  spawnRules: SpawnRule[];
  taskPoolIds: string[];
  dialogProfileId: string;
}
```

```ts
interface NpcInstance {
  definitionId: string;
  regionId: string;
  position: { x: number; y: number };
  trust: number;
  currentTaskId?: string;
}
```

NPC 只提供任务入口和叙事，不在组件中写固定任务。

---

## 7. 副本接口

```ts
interface DungeonDefinition extends BaseEntity {
  name: string;
  type: DungeonType;
  sceneKey: string;
  mapTypes: MapType[];
  triggerCondition: ConditionExpression;
  stages: DungeonStageDefinition[];
  successCondition: ConditionExpression;
  failCondition?: ConditionExpression;
  rewardIds: string[];
  cooldownDays?: number;
}
```

```ts
interface DungeonStageDefinition {
  stageId: string;
  type: "dialog" | "choice" | "movement" | "puzzle" | "result";
  title: string;
  description?: string;
  options?: DungeonOption[];
  nextStageRules: NextStageRule[];
  agentContextId?: string;
}
```

```ts
interface DungeonService {
  createInstance(input: CreateDungeonInput): DungeonInstance;
  applyAction(input: DungeonActionInput): DungeonTransitionResult;
  resume(instanceId: string): DungeonInstance;
}
```

副本必须由状态机驱动，不在 Phaser 场景内用大量 `if/else` 控制剧情。

---

## 8. 结果规则接口

```ts
interface ResultRule {
  id: string;
  priority: number;
  condition: ConditionExpression;
  outcomeCode: string;
  stateDelta: Partial<MapState>;
  rewardIds?: string[];
  reasonCodes: string[];
}
```

```ts
interface ActionResult {
  outcomeCode: string;
  severity: "low" | "medium" | "high";
  stateDelta: Partial<MapState>;
  rewardIds: string[];
  reasonCodes: string[];
  followUpTaskIds?: string[];
}
```

条件表达式由规则模块解析，禁止在配置中执行任意 JavaScript。

---

## 9. Agent 接口

```ts
interface AgentResponse {
  title: string;
  background: string;
  riskItems: Array<{
    optionId?: string;
    level: "low" | "medium" | "high" | "unknown";
    text: string;
  }>;
  stateReminder: string[];
  uncertainty?: string;
  finalNotice: string;
  knowledgeEntryIds?: string[];
}
```

`finalNotice` 默认：

> 最终选择由你决定。

```ts
interface AgentService {
  explainTask(context: AgentTaskContext): Promise<AgentResponse>;
  explainOptions(context: AgentOptionContext): Promise<AgentResponse>;
  generateReview(context: AgentReviewContext): Promise<AgentResponse>;
}
```

接口必须提供超时、错误和本地模板回退。

---

## 10. 奖励接口

```ts
type RewardType =
  | "seed"
  | "material"
  | "title"
  | "skin"
  | "currency"
  | "workshopItem"
  | "badge"
  | "speciesRecord"
  | "mapDecoration";
```

```ts
interface RewardDefinition extends BaseEntity {
  name: string;
  type: RewardType;
  rarity: "common" | "rare" | "epic" | "legendary";
  assetId?: string;
  metadata?: Record<string, unknown>;
}
```

---

## 11. 社交接口

v0.1 使用 mock，但保持真实接口形态。

```ts
interface SocialService {
  listFriends(): Promise<FriendSummary[]>;
  requestAssist(input: AssistRequest): Promise<AssistResult>;
  submitMap(input: EcoSquareSubmission): Promise<SubmissionResult>;
  listRankings(input: RankingQuery): Promise<RankingPage>;
}
```

好友协助必须由服务器或 mock 服务返回结果，不由 UI 直接修改状态。

---

## 12. 存储接口

```ts
interface StorageService {
  loadProfile(): Promise<PlayerProfile | null>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  loadWorldState(mapId: string): Promise<MapState | null>;
  saveWorldState(mapId: string, state: MapState): Promise<void>;
}
```

实现：

- `LocalStorageService`
- 后续 `RemoteStorageService`

---

## 13. Phaser—React 事件接口

```ts
interface GameBridgeEvents {
  GAME_READY: { mapId: string };
  PLAYER_INTERACT: { targetId: string };
  NPC_DIALOG_OPEN: { npcId: string };
  TASK_PROGRESS: { taskId: string; progress: number };
  DUNGEON_STARTED: { dungeonId: string };
  WEATHER_CHANGED: { weather: WeatherSegment };
  MAP_STATE_UPDATED: { summary: MapStateSummary };
  // DEV-05 新增
  WORLD_TIME_CHANGED: { previous: WorldTimeSnapshot | null; current: WorldTimeSnapshot };
  DAY_PHASE_CHANGED: { previousPhase: DayPhase | null; currentPhase: DayPhase; mode: TimeMode; localMinutes: number };
  WEATHER_TIMELINE_GENERATED: { timeline: WeatherTimeline };
  WEATHER_CHANGED_V2: { previousWeather: string | null; current: WeatherSnapshot };
}
```

所有事件必须有类型，不发送无结构字符串或任意对象。

---

## 14. 版本兼容

- 类型字段新增优先使用可选字段；
- 删除字段需要至少一个版本弃用期；
- 内容包必须声明 schemaVersion；
- 配置加载失败时拒绝启用该内容包；
- 存档迁移由 `SaveMigrationService` 负责；
- 任何破坏性变更必须写迁移说明。
