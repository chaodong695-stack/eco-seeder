/**
 * NPC 类型定义。
 *
 * 依据 DEV-03 任务要求，NPC 配置数据驱动，不散落在场景代码中。
 */

/** NPC 配置 — 位置、外观和交互参数集中定义。 */
export interface NpcDefinition {
  /** 稳定唯一 ID。 */
  id: string;
  /** 显示名称。 */
  displayName: string;
  /** 角色或身份。 */
  role: string;
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
  /** 占位视觉颜色。 */
  color: number;
}
