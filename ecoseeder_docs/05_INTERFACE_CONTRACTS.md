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
  // DEV-06 新增
  DAILY_TASKS_GENERATED: { tasks: DailyTaskInstance[] };
  DAILY_TASK_STATUS_CHANGED: { instanceId: string; taskId: string; previousStatus: string; currentStatus: string };
  DAILY_TASK_PROGRESS_CHANGED: { instanceId: string; taskId: string; progress: number; targetValue: number };
  DAILY_TASK_COMPLETED: { instanceId: string; taskId: string };
  DAILY_TASK_PROGRESS_SIGNAL: { objectiveType: string; amount: number; sourceId?: string };
}
```

所有事件必须有类型，不发送无结构字符串或任意对象。

### 13.1 DEV-06 每日任务事件说明

- `DAILY_TASKS_GENERATED`：每日任务生成时发出，携带全部任务实例。
- `DAILY_TASK_STATUS_CHANGED`：任务状态变化时发出（available → active → waiting_condition ↔ active → completed）。
- `DAILY_TASK_PROGRESS_CHANGED`：任务进度增加时发出。
- `DAILY_TASK_COMPLETED`：任务进度达到目标值时发出，仅触发一次。
- `DAILY_TASK_PROGRESS_SIGNAL`：由 Phaser Scene 发出的游戏语义进度信号，由 dailyTaskStore 消费。

事件要求：
- 支持取消订阅（`on()` 返回取消函数）；
- Scene shutdown 时注销监听；
- 相同状态不重复发出事件；
- React HUD 和 Phaser Scene 不绕过事件或 Store 直接互相调用。

---

## 15. 每日任务接口（DEV-06 实现）

### 15.1 每日任务数据模型

```ts
type DailyTaskStatus =
  | 'available'
  | 'active'
  | 'waiting_condition'
  | 'completed';

interface DailyTaskCondition {
  supportedWeather?: WeatherType[];
}

interface DailyTaskReward {
  restorationValue?: number;
}

interface DailyTaskDefinition {
  id: string;
  version: number;
  title: string;
  description: string;
  npcId: string;
  objectiveType: string;
  targetValue: number;
  condition?: DailyTaskCondition;
  weight: number;
  reward?: DailyTaskReward;
}

interface DailyTaskInstance {
  instanceId: string;
  taskId: string;
  localDate: string;
  mapId: string;
  status: DailyTaskStatus;
  progress: number;
  targetValue: number;
  rewardClaimed: boolean;
}

interface TaskProgressSignal {
  objectiveType: string;
  amount: number;
  sourceId?: string;
}
```

### 15.2 任务状态机

```text
available → active → completed
              ↕
      waiting_condition
```

- `available`：可以接取。
- `active`：已接取且当前天气条件满足。
- `waiting_condition`：已接取，但当前天气条件不满足。
- `completed`：目标已完成，奖励已发放。

状态流转规则：
- `available` → `active`：玩家接取任务。
- `active` → `waiting_condition`：天气条件不再满足。
- `waiting_condition` → `active`：天气条件恢复满足。
- `active` → `completed`：进度达到目标值。
- `completed` 为终态，不可回退。

### 15.3 确定性生成规则

生成种子：
```text
anonymousPlayerId:selectedCharacterId:localDate:mapId:dailyTaskPoolVersion
```

使用 mulberry32 伪随机数生成器，相同种子生成相同任务列表。
不使用 `Math.random()`。

角色独立存档：种子中包含 `selectedCharacterId`，切换角色后生成不同任务列表。

生成约束：
- 每日生成 3 个不重复任务；
- 至少包含 1 个无天气限制任务；
- 最多包含 2 个严格天气条件任务；
- 天气条件任务只有在当日天气时间线中至少出现一次对应天气时才可生成；
- 天气任务不足时用普通任务补位。

唯一性保障：
- `dailyTaskGenerator` 使用无放回抽样（Fisher-Yates），确保同一任务定义不会被多次选中；
- 生成后调用 `validateTaskUniqueness` 校验 taskId 和 instanceId 均唯一；
- `instanceId` 由种子和 taskId 确定性生成（`{taskId}:{hash(seed:taskId)}`），保证稳定且唯一；
- `dailyTaskStore` 加载持久化数据时通过 `deduplicatePersistedTasks` 拒绝重复 taskId 或 instanceId；
- 已存储的重复任务数据自动失效并重新生成。

### 15.4 天气条件规则

- 无天气限制的任务在任意天气下均可执行。
- 有天气条件的任务区分“当日是否可能出现该天气”与“当前天气是否满足执行条件”。
  - 当日天气时间线中出现对应天气 → 允许生成该任务。
  - 当前天气满足条件 → 任务可执行（`active`）。
  - 当前天气不满足 → 任务显示“等待天气”（`waiting_condition`），不删除或替换。

三层天气门控：

1. **场景层（VisualController）**：非 `heavy_rain` 时隐藏暴雨垃圾对象；非 `fog` 时隐藏雾天危险点；
2. **交互层（InteractionZone）**：非 `heavy_rain` 时禁用暴雨垃圾交互；非 `light_rain`/`heavy_rain` 时不显示排水设施交互提示；非 `fog` 时不显示雾天危险点交互提示；
3. **Store 层（dailyTaskStore.applyProgress）**：处理 `PROGRESS_SIGNAL` 时再次校验当前天气，天气条件不满足时不计进度。

正确规则：
- 暴雨垃圾仅在 `heavy_rain` 下可见和可交互；
- 排水设施仅在 `light_rain` 或 `heavy_rain` 下可计入任务进度；
- 雾天危险点仅在 `fog` 下可见和可交互；
- 条件不满足时不得显示可交互提示，不得增加进度；
- 天气回来切换不得重复创建对象或重复累计 sourceId。

### 15.5 持久化结构

存储键：`eco-seeder.daily-tasks.v1`

```ts
interface DailyTaskPersistData {
  date: string;
  mapId: string;
  poolVersion: string;
  selectedCharacterId: string;
  tasks: DailyTaskInstance[];
  contributedSources: string[];
  restorationProgress: number;
}
```

使用 Zod 校验，数据损坏时安全回退并重新生成。
localStorage 只是持久化介质，不是运行时事实来源。

DEV-06 第四轮修复新增持久化字段：
- `selectedCharacterId`：角色独立存档，切换角色后旧数据自动失效；
- `contributedSources`：已消费的 sourceId 集合，刷新页面后防重复；
- `restorationProgress`：区域修复进度，保证任务完成与区域修复进度一致。

环境状态持久化：`eco-seeder.environment.v1`
```ts
interface EnvironmentPersistData {
  state: EnvironmentState;
  appliedTargetIds: string[];
}
```

加载时去重：
- `dailyTaskStore.init()` 加载持久化数据时调用 `deduplicatePersistedTasks`；
- 如果存在重复 taskId 或 instanceId，只保留第一个出现的实例；
- 如果去重后任务数量不足或检测到重复，自动重新生成当日任务。
- `isPersistDataValid` 检查 date、mapId、poolVersion 和 selectedCharacterId 四个维度。

### 15.6 第二 NPC 定义

```ts
interface NpcDefinition {
  id: string;
  displayName: string;
  role: string;
  x: number;
  y: number;
  width: number;
  height: number;
  interactionRange: number;
  color: number;
}
```

第二 NPC：`npc_weather_ranger`（环境巡查员），负责天气巡查、排水设施检查、暴雨垃圾扩散和雾天风险任务。

NPC 碰撞策略：
- `npc.engineer.lin`（林工）保留实体碰撞（`collider`），不位于主要通行路线；
- `npc_weather_ranger`（巡查员）使用非阻挡型触发器（`overlap`），玩家可以穿过，不阻挡通路。

NPC 任务接取：
- `dailyTaskStore.acceptTask(instanceId)` 提供统一的接取接口；
- 所属 NPC 对话框列出其负责的可接取任务；
- 提供明确的接取操作（接取按钮）；
- 接取后更新 Store、持久化和 NPC 指示符；
- 发出一次 `DAILY_TASK_STATUS_CHANGED` 事件；
- 已接取和已完成任务不可重复接取。

NPC 指示符：
- `!`：有可接取任务；
- `…`：任务进行中（`active`）；
- `⏳`：等待天气（`waiting_condition`）；
- `✓`：今日任务已完成。

### 15.7 生命周期和清理

- Scene `create()` 中初始化每日任务 Store（幂等）。
- Scene `SHUTDOWN`/`DESTROY` 时注销所有 GameBridge 监听。
- NPC 在 `create()` 中创建，`handleSceneCleanup()` 中销毁，不重复创建。
- 返回开始页不清空当日任务和环境修复进度，重新进入后恢复。
- 日期变化后自动生成新一日任务。

角色切换策略（策略 A：角色独立存档）：
- 切换角色时清除每日任务持久化数据；
- 重置环境状态（包括 environmentStore 的 localStorage）；
- 重置 dailyTaskStore 状态（isInitialized=false）；
- 场景重建后 init() 使用新的 selectedCharacterId 生成新任务；
- 旧角色的任务进度和区域修复状态不再保留。

任务完成与区域修复一致性：
- 任务完成时通过 `applyTaskReward` 将 `reward.restorationValue` 应用到 `environmentStore`；
- 奖励最多发放一次（由 `rewardClaimed` 标志和 `appliedTargetIds` 共同保证）；
- `restorationProgress` 随每日任务一起持久化，刷新后保持一致。

### 15.8 UI 布局

右侧采用可折叠 HUD 抽屉（`CollapsibleRightHud`），替代原来双面板常驻布局：

```text
右上角常驻紧凑状态栏

[区域状态  修复中 ▼]
[每日任务  0/3 ▼]
```

点击后展开对应内容：

```text
区域状态 ▼
├─ 污染程度
├─ 植被状况
├─ 水质状态
└─ 修复进度

每日任务 ▼
├─ 任务一
├─ 任务二
└─ 任务三
```

交互要求：
1. 默认仅显示紧凑标题和关键摘要；
2. 点击标题展开或收起；
3. 只允许一个面板同时展开；
4. 展开高度不得超过可视区域；
5. 内容过多时仅面板内部滚动；
6. 不得遮挡底部主要按钮；
7. 小尺寸窗口下默认折叠；
8. 面板展开时不能阻断键盘移动。

### 15.9 任务入口统一

三处任务 UI 职责清晰：

- **右侧每日任务**（`DailyTaskPanel`）：紧凑进度摘要，折叠后仅显示计数；
- **底部任务按钮**（`TaskPanel`）：完整任务详情，显示标题、描述、进度、目标值、来源 NPC、天气条件、当前状态、完成方式提示；
- **NPC 对话**（`NpcDialog`）：接取 NPC 所属任务。

三处必须读取同一个 `dailyTaskStore`，不得各自维护任务副本。
旧任务 Store（`taskStore`）不再影响 DailyTaskPanel 和 TaskPanel。

进行中任务 = `status === "active" || status === "waiting_condition"`

### 15.10 开发调试面板

仅 `import.meta.env.DEV` 为 true 时渲染 `DevDebugPanel`，生产环境不渲染。

显示内容：
- 当前 `dailyTaskStore` 状态（tasks、isInitialized、contributedSources）；
- 当前 `worldStore` 日期和天气；
- 当前选中角色 ID；
- 当前区域状态（restorationProgress、pollution、visualStage、appliedTargetIds）；
- localStorage 中的每日任务 payload（含 contributedSources、restorationProgress）；
- 当前任务存储 key；
- 当前任务生成种子。

### 15.11 任务目标映射

每个进入正式生成池的每日任务都必须有对应的场景交互对象：

| 任务 ID                    | objectiveType       | 场景对象         | 天气条件  | 目标值 |
| ------------------------ | ------------------- | ------------ | ----- | --- |
| daily_collect_waste      | collect_waste       | 污染物堆        | 无     | 1   |
| daily_restore_area       | restore_area        | 受损环境点       | 无     | 2   |
| daily_drainage_check     | inspect_drainage    | 排水设施        | 小雨、暴雨 | 1   |
| daily_storm_waste        | collect_storm_waste | 暴雨冲散垃圾     | 暴雨    | 1   |
| daily_ecology_patrol     | ecology_patrol      | 生态巡查点       | 晴朗、阴天 | 3   |
| daily_fog_hazard_marking | fog_hazard_marking  | 雾天危险点       | 雾     | 2   |

映射表定义在 `TASK_OBJECTIVE_SOURCE_MAP`，所有任务定义通过 `getCompletableTaskDefinitions()` 过滤后才能进入任务生成池。

---

## 14. 版本兼容

- 类型字段新增优先使用可选字段；
- 删除字段需要至少一个版本弃用期；
- 内容包必须声明 schemaVersion；
- 配置加载失败时拒绝启用该内容包；
- 存档迁移由 `SaveMigrationService` 负责；
- 任何破坏性变更必须写迁移说明。
