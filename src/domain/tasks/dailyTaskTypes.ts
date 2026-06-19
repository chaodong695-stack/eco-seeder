/**
 * 每日任务类型定义。
 *
 * 任务定义（静态配置）与任务实例（运行时状态）分离。
 * 状态机：available → active → completed，active 可在 waiting_condition 间切换。
 */

import type { WeatherType } from '@/domain/weather/weatherTypes';

/** 每日任务状态。 */
export type DailyTaskStatus =
  | 'available'
  | 'active'
  | 'waiting_condition'
  | 'completed';

/** 任务天气条件。 */
export interface DailyTaskCondition {
  /** 支持的天气类型列表，空或 undefined 表示无天气限制。 */
  supportedWeather?: WeatherType[];
}

/** 任务奖励。 */
export interface DailyTaskReward {
  /** 恢复值奖励（复用环境恢复体系）。 */
  restorationValue?: number;
}

/** 每日任务定义 — 静态配置数据，不持久化。 */
export interface DailyTaskDefinition {
  /** 稳定唯一 ID。 */
  id: string;
  /** 定义版本。 */
  version: number;
  /** 任务标题。 */
  title: string;
  /** 任务描述。 */
  description: string;
  /** 负责该任务的 NPC ID。 */
  npcId: string;
  /** 目标类型（用于匹配进度信号）。 */
  objectiveType: string;
  /** 目标值。 */
  targetValue: number;
  /** 天气条件。 */
  condition?: DailyTaskCondition;
  /** 选取权重。 */
  weight: number;
  /** 奖励配置。 */
  reward?: DailyTaskReward;
}

/** 每日任务实例 — 运行时状态，持久化存储。 */
export interface DailyTaskInstance {
  /** 实例 ID（确定性生成）。 */
  instanceId: string;
  /** 关联的任务定义 ID。 */
  taskId: string;
  /** 本地日期 YYYY-MM-DD。 */
  localDate: string;
  /** 地图 ID。 */
  mapId: string;
  /** 当前状态。 */
  status: DailyTaskStatus;
  /** 当前进度。 */
  progress: number;
  /** 目标值。 */
  targetValue: number;
  /** 奖励是否已发放。 */
  rewardClaimed: boolean;
}

/** 任务进度信号 — 由游戏语义事件驱动。 */
export interface TaskProgressSignal {
  /** 目标类型。 */
  objectiveType: string;
  /** 进度增量。 */
  amount: number;
  /** 来源对象 ID（用于防重复）。 */
  sourceId?: string;
}

/** 每日任务生成输入参数。 */
export interface DailyTaskGenerationInput {
  /** 匿名玩家 ID。 */
  anonymousPlayerId: string;
  /** 选中角色 ID（用于角色独立存档种子）。 */
  selectedCharacterId: string;
  /** 本地日期。 */
  localDate: string;
  /** 地图 ID。 */
  mapId: string;
  /** 任务池版本。 */
  dailyTaskPoolVersion: string;
  /** 当日天气时间线中出现的所有天气类型。 */
  availableWeatherTypes: WeatherType[];
}
