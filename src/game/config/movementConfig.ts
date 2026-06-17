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
