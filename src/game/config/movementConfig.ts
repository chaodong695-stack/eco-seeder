/**
 * 玩家移动与交互集中配置。
 *
 * 将移动速度、输入映射等常量集中管理，
 * 避免散落在场景代码中。
 */

/** 玩家移动速度（像素/秒）。 */
export const PLAYER_SPEED = 520;

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

/** 地面顶部 Y 坐标（世界坐标系）。物体脚底应对齐此线。
 * 2.5D 改造后仅作为地面纹理前缘参考；实体实际分布见 WALKABLE_Y_MIN/MAX。
 */
export const GROUND_TOP_Y = 880;

/** 可行走纵深带上边界（世界坐标系）— 玩家脚底可到达的最小 y（靠近画面上方/远景）。
 * 对齐背景图地面起始位置（约世界高度 65%）。
 */
export const WALKABLE_Y_MIN = 700;

/** 可行走纵深带下边界（世界坐标系）— 玩家脚底可到达的最大 y（靠近画面下方/前景）。 */
export const WALKABLE_Y_MAX = 1040;

/** 可行走纵深带高度（像素）。 */
export const WALKABLE_BAND_HEIGHT = WALKABLE_Y_MAX - WALKABLE_Y_MIN;
