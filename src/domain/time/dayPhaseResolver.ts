/**
 * 昼夜阶段解析器 — 纯函数。
 *
 * 不在 UI 组件和 Scene 中重复计算时间阶段。
 */

import type { DayPhase, DayPhaseBoundaries } from './timeTypes';
import { DEFAULT_DAY_PHASE_BOUNDARIES } from './timeTypes';

/** 一天的总分钟数。 */
export const MINUTES_PER_DAY = 1440;

/**
 * 将分钟数规范化到 0–1439 范围。
 *
 * 负数或超过 1439 的值会被归一化。
 */
export function normalizeMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 0;
  const rounded = Math.floor(minutes);
  return ((rounded % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/**
 * 根据分钟数解析昼夜阶段。
 *
 * 默认边界：
 * - dawn：05:00–07:59
 * - day：08:00–16:59
 * - dusk：17:00–19:59
 * - night：20:00–04:59
 *
 * night 跨越午夜，即 [nightStart, 1440) ∪ [0, dawnStart)。
 */
export function resolveDayPhase(
  minutes: number,
  boundaries: DayPhaseBoundaries = DEFAULT_DAY_PHASE_BOUNDARIES,
): DayPhase {
  const m = normalizeMinutes(minutes);

  if (m >= boundaries.nightStart || m < boundaries.dawnStart) {
    return 'night';
  }
  if (m >= boundaries.duskStart) {
    return 'dusk';
  }
  if (m >= boundaries.dayStart) {
    return 'day';
  }
  return 'dawn';
}

/**
 * 验证分钟数是否在有效范围内。
 */
export function isValidMinutes(minutes: number): boolean {
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= 1439;
}
