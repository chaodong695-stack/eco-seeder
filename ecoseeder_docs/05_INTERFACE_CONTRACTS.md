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

```ts
interface MapDefinition extends BaseEntity {
  name: string;
  type: MapType;
  description: string;
  sceneKey: string;
  climateProfileId: string;
  regions: MapRegionDefinition[];
  initialState: MapState;
  dailyTaskPoolIds: string[];
  randomTaskPoolIds: string[];
  dungeonPoolIds: string[];
  npcPoolIds: string[];
  rewardPoolId: string;
  unlockCondition?: ConditionExpression;
}
```

```ts
interface MapState {
  airPollution: number;
  waterContamination: number;
  soilToxicity: number;
  solidWaste: number;
  drainageCapacity: number;
  habitatSafety: number;
  infrastructureSafety: number;
  publicSupport: number;
  vegetation: number;
  biodiversity: number;
  disturbance: number;
  predatorRisk: number;
  rescueSpeed: number;
  naturalFood: number;
}
```

所有数值范围默认 `0—100`，除非字段明确说明。

---

## 4. 天气接口

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
