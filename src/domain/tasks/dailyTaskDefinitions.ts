/**
 * 每日任务定义配置 — 集中管理所有任务定义。
 *
 * 任务文本、目标值、条件、NPC 归属和奖励配置集中保存，
 * 不分散写死在 React 组件或 Phaser Scene 中。
 */

import type { DailyTaskDefinition } from './dailyTaskTypes';

/** 任务池版本 — 用于确定性种子。 */
export const DAILY_TASK_POOL_VERSION = 'daily-tasks.v1';

/** 所有每日任务定义。 */
export const DAILY_TASK_DEFINITIONS: DailyTaskDefinition[] = [
  {
    id: 'daily_collect_waste',
    version: 1,
    title: '清理散落垃圾',
    description: '在场景中找到并清理散落的垃圾堆。',
    npcId: 'npc.engineer.lin',
    objectiveType: 'collect_waste',
    targetValue: 1,
    weight: 10,
    reward: { restorationValue: 5 },
  },
  {
    id: 'daily_restore_area',
    version: 1,
    title: '修复受损环境点',
    description: '修复场景中的受损环境区域。',
    npcId: 'npc.engineer.lin',
    objectiveType: 'restore_area',
    targetValue: 2,
    weight: 10,
    reward: { restorationValue: 8 },
  },
  {
    id: 'daily_drainage_check',
    version: 1,
    title: '检查排水设施',
    description: '检查排水设施，确保暴雨时排水通畅。',
    npcId: 'npc_weather_ranger',
    objectiveType: 'inspect_drainage',
    targetValue: 1,
    condition: { supportedWeather: ['light_rain', 'heavy_rain'] },
    weight: 8,
    reward: { restorationValue: 6 },
  },
  {
    id: 'daily_storm_waste',
    version: 1,
    title: '清理暴雨冲散垃圾',
    description: '暴雨冲散了大量垃圾，请尽快清理。',
    npcId: 'npc_weather_ranger',
    objectiveType: 'collect_storm_waste',
    targetValue: 1,
    condition: { supportedWeather: ['heavy_rain'] },
    weight: 6,
    reward: { restorationValue: 10 },
  },
  {
    id: 'daily_ecology_patrol',
    version: 1,
    title: '完成生态巡查',
    description: '在晴朗或阴天时完成生态巡查。',
    npcId: 'npc_weather_ranger',
    objectiveType: 'ecology_patrol',
    targetValue: 3,
    condition: { supportedWeather: ['clear', 'overcast'] },
    weight: 8,
    reward: { restorationValue: 7 },
  },
  {
    id: 'daily_fog_hazard_marking',
    version: 1,
    title: '标记雾中危险区域',
    description: '雾天能见度低，标记危险区域以防事故。',
    npcId: 'npc_weather_ranger',
    objectiveType: 'fog_hazard_marking',
    targetValue: 2,
    condition: { supportedWeather: ['fog'] },
    weight: 6,
    reward: { restorationValue: 8 },
  },
];

/** 每日任务生成数量。 */
export const DAILY_TASKS_PER_DAY = 3;

/** 最多严格天气条件任务数。 */
export const MAX_STRICT_WEATHER_TASKS = 2;

/** 最少无天气限制任务数。 */
export const MIN_UNCONDITIONAL_TASKS = 1;

/**
 * 根据任务 ID 查找定义。
 */
export function findDailyTaskById(id: string): DailyTaskDefinition | undefined {
  return DAILY_TASK_DEFINITIONS.find((t) => t.id === id);
}

/**
 * 根据 NPC ID 获取其负责的任务定义列表。
 */
export function getDailyTasksByNpcId(npcId: string): DailyTaskDefinition[] {
  return DAILY_TASK_DEFINITIONS.filter((t) => t.npcId === npcId);
}

/**
 * 任务目标类型 → 场景交互对象 ID 列表的映射。
 *
 * 每个进入正式生成池的每日任务都必须在此映射中注册其对应的场景交互对象。
 * 如果某任务没有交互对象，则不应进入正式任务生成池。
 */
export const TASK_OBJECTIVE_SOURCE_MAP: Record<string, string[]> = {
  collect_waste: ['interaction.pollution_zone_01'],
  restore_area: ['interaction.damaged_env_01', 'interaction.damaged_env_02'],
  inspect_drainage: ['interaction.drainage_facility_01'],
  collect_storm_waste: ['interaction.storm_debris_01'],
  ecology_patrol: [
    'interaction.ecology_patrol_01',
    'interaction.ecology_patrol_02',
    'interaction.ecology_patrol_03',
  ],
  fog_hazard_marking: ['interaction.fog_hazard_01', 'interaction.fog_hazard_02'],
};

/**
 * 检查任务定义是否有对应的场景交互对象。
 */
export function hasObjectiveSource(def: import('./dailyTaskTypes').DailyTaskDefinition): boolean {
  return (
    TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType] !== undefined &&
    TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType].length > 0
  );
}

/**
 * 获取任务定义对应的场景交互对象 ID 列表。
 */
export function getObjectiveSources(def: import('./dailyTaskTypes').DailyTaskDefinition): string[] {
  return TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType] ?? [];
}

/**
 * 获取所有可完成的任务定义（有场景交互对象的）。
 *
 * 不可完成的任务不会进入正式任务生成池。
 */
export function getCompletableTaskDefinitions(): import('./dailyTaskTypes').DailyTaskDefinition[] {
  return DAILY_TASK_DEFINITIONS.filter(hasObjectiveSource);
}
