/**
 * 玩家移动与交互集中配置。
 *
 * 将移动速度、输入映射等常量集中管理，
 * 避免散落在场景代码中。
 */

/** 玩家移动速度（像素/秒）。 */
export const PLAYER_SPEED = 200;

/** 玩家占位角色尺寸。 */
export const PLAYER_SIZE = {
  width: 32,
  height: 48,
} as const;

/** 主场景世界尺寸。 */
export const WORLD_BOUNDS = {
  width: 1920,
  height: 1080,
} as const;

/** 摄像机平滑跟随系数。 */
export const CAMERA_FOLLOW = {
  lerpX: 0.08,
  lerpY: 0.08,
} as const;

/** 交互触发距离（像素）。 */
export const INTERACTION_RANGE = 80;

/** 交互冷却时间（毫秒），防止同一帧内重复触发。 */
export const INTERACTION_COOLDOWN_MS = 300;

/** 调试标志 — 是否显示碰撞矩形、占位块和调试色块。
 * 设为 false 时，所有逻辑矩形（碰撞体、任务点、交互范围）在正常游戏模式下隐藏可视化显示，
 * 只保留真实图片素材和必要的文本标签。
 */
export const DEBUG_HITBOX = false;

/** 地面顶部 Y 坐标（世界坐标系）。物体脚底应对齐此线。 */
export const GROUND_TOP_Y = 880;
