/**
 * 视差（Parallax）配置 — 2.5D 主场景各图层滚动系数。
 *
 * 规范：主游戏界面 2.5D 视觉改造执行规范 §9。
 * 各层共享统一常量，第一版先固定，后续根据运行效果微调。
 *
 * 移动速度顺序（从慢到快）：
 *   Sky (0.05) → Far (0.20) → Mid (0.48) → Ground (1.00) → Gameplay (1.00) → Foreground (1.10)
 */
export const PARALLAX = {
  sky: 0.05,
  far: 0.20,
  mid: 0.48,
  ground: 1.0,
  gameplay: 1.0,
  foreground: 1.10,
} as const;

/** 远景地平线 Y 坐标（世界坐标系）— 远景建筑底边对齐此线。 */
export const FAR_HORIZON_Y = 760;

/** 中景底边 Y 坐标（世界坐标系）— 中景废墟剪影底边对齐此线。 */
export const MID_BOTTOM_Y = 900;

/** 前景锚点 Y 坐标（世界坐标系）— 前景图底边对齐此线。
 * 大于 WORLD_BOUNDS.height 以保证 scrollFactor=1.10 时仍覆盖视口底部。
 */
export const FOREGROUND_ANCHOR_Y = 1120;
