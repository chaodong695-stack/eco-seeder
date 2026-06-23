/**
 * Eco Seeder 基础类型定义
 *
 * 本文件中的类型依据 05_INTERFACE_CONTRACTS.md 建立，
 * 不得与正式接口契约冲突。
 */

// ─── 通用基础 ──────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  version: number;
  tags?: string[];
}

// ─── 地图类型 ──────────────────────────────────────────────

export type MapType = 'urban_wasteland' | (string & {});

export type MapRegionType = 'industrial' | 'residential' | 'wetland' | (string & {});

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapRegionDefinition extends BaseEntity {
  displayName: string;
  description: string;
  type: MapRegionType;
  bounds: RegionBounds;
  interactionPointIds: string[];
}

// ─── 地图环境状态 ──────────────────────────────────────────

export interface MapState {
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

// ─── 地图视觉阶段 ──────────────────────────────────────────

export type MapVisualStage = 'polluted' | 'restoring' | 'restored';

// ─── 地图定义 ──────────────────────────────────────────────

export interface MapDefinition extends BaseEntity {
  displayName: string;
  type: MapType;
  description: string;
  sceneKey: string;
  primaryRegionId: string;
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

// ─── 条件表达式（骨架占位） ────────────────────────────────

export interface ConditionExpression {
  type: string;
  [key: string]: unknown;
}

// ─── 玩家角色选择 ──────────────────────────────────────────

export type PlayerCharacterGender = 'male' | 'female';

export interface PlayerCharacterChoice {
  characterId: string;
  gender: PlayerCharacterGender;
  displayName: string;
}

// ─── 任务摘要 ──────────────────────────────────────────────

export type TaskCategory = 'daily' | 'random' | 'npc';

export type TaskInstanceStatus =
  | 'available'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'failed';

export interface TaskSummary {
  instanceId: string;
  definitionId: string;
  name: string;
  category: TaskCategory;
  status: TaskInstanceStatus;
  description: string;
}

// ─── NPC 对话摘要 ──────────────────────────────────────────

export interface NpcDialogSummary {
  npcId: string;
  npcName: string;
  npcRole: string;
  lines: string[];
  hasTask: boolean;
}

// ─── 资源清单 ──────────────────────────────────────────────

export type AssetCategory =
  | 'map'
  | 'character'
  | 'npc'
  | 'robot'
  | 'ui'
  | 'icon'
  | 'effect'
  | 'audio';

export interface AssetManifestEntry {
  id: string;
  category: AssetCategory;
  path: string;
  format: string;
  description?: string;
}

export interface AssetBundle {
  id: string;
  name: string;
  entryIds: string[];
}

export interface AssetManifest {
  version: string;
  baseUrl: string;
  bundles: AssetBundle[];
}

// ─── 音频清单 ──────────────────────────────────────────────

export type AudioType = 'voice' | 'sfx' | 'ambient' | 'music';

export type AudioCategory =
  | 'narrator'
  | 'guide'
  | 'npc'
  | 'ui'
  | 'task'
  | 'environment'
  | 'music';

export interface AudioManifestEntry {
  id: string;
  type: AudioType;
  category: AudioCategory;
  path: string;
  loop: boolean;
  volume: number;
}

export interface AudioManifest {
  version: string;
  entries: AudioManifestEntry[];
}
