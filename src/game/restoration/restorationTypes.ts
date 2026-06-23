/**
 * 修复行为类型定义。
 *
 * 依据 DEV-04 要求，使用明确的状态枚举和类型化 payload，
 * 避免互不约束的布尔值。
 */

/** 修复行为状态有限状态机。 */
export type RestorationActionStatus =
  | 'idle'
  | 'in_progress'
  | 'interrupted'
  | 'completed';

/** 修复行为类型。 */
export type RestorationActionType = 'pollution_cleanup';

/** 修复视觉阶段。 */
export type RestorationVisualStage = 'polluted' | 'recovering' | 'restored';

/** 环境效果增量配置。 */
export interface EnvironmentEffect {
  /** 污染程度变化（负值减少污染）。 */
  pollution: number;
  /** 植被状况变化（正值增加植被）。 */
  vegetation: number;
  /** 水质状态变化（正值改善水质）。 */
  waterQuality: number;
  /** 修复进度变化。 */
  restorationProgress: number;
}

/** 修复视觉阶段配置。 */
export interface RestorationVisualStageConfig {
  /** 视觉阶段。 */
  stage: RestorationVisualStage;
  /** 污染物堆颜色（占位）。 */
  targetColor: number;
  /** 污染物堆透明度。 */
  targetAlpha: number;
  /** 污染物堆缩放。 */
  targetScale: number;
  /** 场景背景色调（占位）。 */
  backgroundTint: number;
}

/** 修复目标定义 — 数据驱动的可修复交互对象配置。 */
export interface RestorationTargetDefinition {
  /** 稳定唯一 ID。 */
  id: string;
  /** 显示名称。 */
  displayName: string;
  /** 关联的交互对象 ID。 */
  interactionId: string;
  /** 关联的任务 ID。 */
  taskId: string;
  /** 修复行为类型。 */
  actionType: RestorationActionType;
  /** 清理持续时间（毫秒）。 */
  durationMs: number;
  /** 交互触发距离（像素）。 */
  interactionRange: number;
  /** 完成修复后应用的环境效果。 */
  environmentEffects: EnvironmentEffect[];
  /** 视觉阶段配置列表。 */
  visualStages: RestorationVisualStageConfig[];
}

// ─── GameBridge 事件 payload ─────────────────────────────

/** 修复开始事件 payload。 */
export interface RestorationStartedPayload {
  targetId: string;
  interactionId: string;
  displayName: string;
  durationMs: number;
}

/** 修复进度事件 payload。 */
export interface RestorationProgressPayload {
  targetId: string;
  interactionId: string;
  progress: number;
  elapsedMs: number;
  durationMs: number;
}

/** 修复中断事件 payload。 */
export interface RestorationInterruptedPayload {
  targetId: string;
  interactionId: string;
  progress: number;
  reason: string;
  /** 玩家是否在交互范围内。 */
  inRange: boolean;
}

/** 修复完成事件 payload。 */
export interface RestorationCompletedPayload {
  targetId: string;
  interactionId: string;
  displayName: string;
}

/** 环境更新事件 payload。 */
export interface EnvironmentUpdatedPayload {
  pollution: number;
  vegetation: number;
  waterQuality: number;
  restorationProgress: number;
  visualStage: RestorationVisualStage;
}

/** 视觉阶段变化事件 payload。 */
export interface VisualStageChangedPayload {
  interactionId: string;
  stage: RestorationVisualStage;
}
