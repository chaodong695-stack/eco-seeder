/**
 * 修复进度计算 — 纯函数，便于单元测试。
 *
 * 进度基于 Phaser 更新循环的 delta 时间累积，
 * 不依赖浏览器键盘重复事件。
 * 进度范围为 0–1。
 */

/**
 * 根据已过时间和总持续时间计算进度。
 *
 * @param elapsedMs 已经过的清理时间（毫秒）
 * @param durationMs 总持续时间（毫秒）
 * @returns 进度值 0–1
 */
export function calculateProgress(
  elapsedMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return 1;
  const raw = elapsedMs / durationMs;
  return clamp01(raw);
}

/**
 * 将值限制在 0–1 范围。
 */
export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * 将值限制在 0–100 范围。
 */
export function clamp100(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * 将进度（0–1）转为百分比（0–100）。
 */
export function progressToPercent(progress: number): number {
  return Math.round(clamp01(progress) * 100);
}

/**
 * 判断进度是否已完成（达到 1）。
 */
export function isProgressComplete(progress: number): boolean {
  return progress >= 1;
}

/**
 * 累加 delta 时间到已过时间，返回新的已过时间。
 *
 * 不受键盘重复事件影响 — 纯粹基于 delta 累加。
 *
 * @param elapsedMs 当前已过时间
 * @param deltaMs 本帧 delta 时间
 * @param durationMs 总持续时间
 * @returns 更新后的已过时间（不超过 durationMs）
 */
export function accumulateElapsed(
  elapsedMs: number,
  deltaMs: number,
  durationMs: number,
): number {
  const newElapsed = elapsedMs + Math.max(0, deltaMs);
  return Math.min(newElapsed, durationMs);
}

/**
 * 生成进度条文本表示。
 *
 * @param progress 进度值 0–1
 * @param filledChar 填充字符
 * @param emptyChar 空白字符
 * @param totalChars 总字符数
 */
export function progressBarText(
  progress: number,
  filledChar = '█',
  emptyChar = '░',
  totalChars = 10,
): string {
  const clamped = clamp01(progress);
  const filled = Math.round(clamped * totalChars);
  const empty = totalChars - filled;
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}
