/**
 * 任务类型定义。
 *
 * 依据 DEV-03 要求，使用明确的状态枚举，避免互不约束的布尔值。
 */

/** 任务状态有限状态机。 */
export type TaskStatus =
  | 'available'
  | 'active'
  | 'objective_completed'
  | 'completed';

/** 占位奖励信息。 */
export interface TaskReward {
  ecoPoints: number;
  reputation: number;
}

/** 任务定义 — 静态配置数据。 */
export interface TaskDefinition {
  /** 稳定唯一 ID。 */
  id: string;
  /** 任务标题。 */
  title: string;
  /** 任务简介。 */
  description: string;
  /** 发布任务的 NPC ID。 */
  giverNpcId: string;
  /** 目标交互对象 ID。 */
  targetInteractionId: string;
  /** 接取后的目标描述。 */
  activeObjectiveText: string;
  /** 目标完成后的目标描述。 */
  objectiveCompletedText: string;
  /** 占位奖励。 */
  reward: TaskReward;
}

/** 任务运行时状态 — 反映任务在状态机中的当前位置。 */
export interface TaskState {
  /** 任务 ID。 */
  taskId: string;
  /** 当前状态。 */
  status: TaskStatus;
  /** 当前目标描述。 */
  currentObjectiveText: string;
  /** 奖励是否已结算。 */
  rewardClaimed: boolean;
}
