/**
 * 交互系统类型定义。
 */

/** 交互对象类型 — 占位分类。 */
export type InteractionType =
  | 'pollution'
  | 'abandoned_equipment'
  | 'restoration_zone'
  | 'npc_placeholder'
  | 'monitoring_device'
  | 'damaged_environment'
  | 'ecology_patrol_point'
  | 'fog_hazard_point';

/** 交互对象配置 — 位置和交互范围不散落在业务代码中。 */
export interface InteractionObjectConfig {
  /** 稳定唯一 ID。 */
  id: string;
  /** 交互类型。 */
  type: InteractionType;
  /** 显示名称。 */
  displayName: string;
  /** 世界坐标 X。 */
  x: number;
  /** 世界坐标 Y。 */
  y: number;
  /** 视觉宽度。 */
  width: number;
  /** 视觉高度。 */
  height: number;
  /** 交互触发距离（像素）。 */
  interactionRange: number;
  /** 占位反馈消息。 */
  feedbackMessage: string;
  /** 视觉颜色（占位）。 */
  color: number;
  /**
   * Phaser 纹理 key — 如果提供则使用图片渲染，否则使用颜色矩形。
   * 在 preload 阶段加载的纹理 key。
   */
  textureKey?: string;
  /**
   * 恢复后使用的纹理 key（可选）。
   * 例如污染物堆修复后显示绿植图片。
   */
  restoredTextureKey?: string;
  /** 图片显示高度（像素），用于缩放控制。 */
  displayHeight?: number;
}

/** 交互可用事件 payload。 */
export interface InteractionAvailablePayload {
  objectId: string;
  displayName: string;
  type: InteractionType;
  hint: string;
}

/** 交互不可用事件 payload。 */
export interface InteractionUnavailablePayload {
  objectId: string;
}

/** 交互触发事件 payload。 */
export interface InteractionTriggeredPayload {
  objectId: string;
  displayName: string;
  type: InteractionType;
  message: string;
}
