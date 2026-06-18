/**
 * 修复行为状态机 — 纯函数，约束状态流转。
 *
 * 允许的流转：
 *   idle → in_progress
 *   in_progress → interrupted
 *   interrupted → in_progress
 *   in_progress → completed
 *
 * 不允许：
 *   idle → completed
 *   completed → in_progress
 *   completed → interrupted
 */

import type { RestorationActionStatus } from './restorationTypes';

/**
 * 检查状态流转是否合法。
 */
export function canRestorationTransition(
  from: RestorationActionStatus,
  to: RestorationActionStatus,
): boolean {
  const validTransitions: Record<
    RestorationActionStatus,
    RestorationActionStatus[]
  > = {
    idle: ['in_progress'],
    in_progress: ['interrupted', 'completed'],
    interrupted: ['in_progress'],
    completed: [],
  };

  return validTransitions[from].includes(to);
}

/**
 * 尝试流转状态，返回新状态或 null（非法流转）。
 */
export function restorationTransition(
  from: RestorationActionStatus,
  to: RestorationActionStatus,
): RestorationActionStatus | null {
  if (canRestorationTransition(from, to)) {
    return to;
  }
  return null;
}

/**
 * 判断是否处于终态完成。
 */
export function isRestorationCompleted(
  status: RestorationActionStatus,
): boolean {
  return status === 'completed';
}

/**
 * 判断是否处于活跃操作中。
 */
export function isRestorationActive(
  status: RestorationActionStatus,
): boolean {
  return status === 'in_progress';
}
