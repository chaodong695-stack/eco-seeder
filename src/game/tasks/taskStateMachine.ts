/**
 * 任务状态机 — 纯函数，约束状态流转。
 *
 * 允许的流转：
 *   available → active → objective_completed → completed
 *
 * 不允许：
 *   available → completed
 *   active → completed
 *   completed → active（或任何回退）
 */

import type { TaskStatus } from './taskTypes';

/**
 * 检查状态流转是否合法。
 */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus | null> = {
    available: 'active',
    active: 'objective_completed',
    objective_completed: 'completed',
    completed: null,
  };

  return validTransitions[from] === to;
}

/**
 * 尝试流转状态，返回新状态或 null（非法流转）。
 */
export function transition(
  from: TaskStatus,
  to: TaskStatus,
): TaskStatus | null {
  if (canTransition(from, to)) {
    return to;
  }
  return null;
}

/**
 * 判断任务是否处于可接取状态。
 */
export function isAvailable(status: TaskStatus): boolean {
  return status === 'available';
}

/**
 * 判断任务是否已终态完成。
 */
export function isCompleted(status: TaskStatus): boolean {
  return status === 'completed';
}
