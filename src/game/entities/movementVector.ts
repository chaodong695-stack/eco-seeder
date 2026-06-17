/**
 * 玩家移动方向向量计算 — 纯函数，便于单元测试。
 *
 * 支持方向键和 WASD，对角线移动归一化避免速度增益。
 */

export interface MovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface MovementVector {
  vx: number;
  vy: number;
}

/**
 * 将方向输入转换为归一化移动向量。
 *
 * - 无输入时返回 (0, 0)；
 * - 单方向输入时返回单位向量乘以速度；
 * - 对角线输入时经过归一化，速度与单方向一致。
 *
 * @param input 方向输入状态
 * @param speed 移动速度（像素/秒）
 */
export function computeMovementVector(
  input: MovementInput,
  speed: number,
): MovementVector {
  let dx = 0;
  let dy = 0;

  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  // 无输入
  if (dx === 0 && dy === 0) {
    return { vx: 0, vy: 0 };
  }

  // 归一化对角线向量
  const length = Math.sqrt(dx * dx + dy * dy);
  return {
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
  };
}
