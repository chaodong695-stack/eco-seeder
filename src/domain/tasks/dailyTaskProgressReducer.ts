/**
 * 每日任务进度归并 — 纯函数。
 *
 * 处理进度信号，防重复，判断完成状态。
 */

import type { DailyTaskInstance, TaskProgressSignal } from './dailyTaskTypes';

/**
 * 进度归并结果。
 */
export interface ProgressReduceResult {
  /** 更新后的任务实例。 */
  instance: DailyTaskInstance;
  /** 进度是否实际增加了。 */
  changed: boolean;
  /** 任务是否刚刚完成。 */
  justCompleted: boolean;
}

/**
 * 对单个任务实例应用进度信号。
 *
 * 纯函数：不修改输入实例，返回新实例。
 *
 * 规则：
 * - completed 任务不再接受进度；
 * - available 任务不接受进度（需要先接取）；
 * - waiting_condition 任务不接受进度（天气条件不满足）；
 * - 同一 sourceId 不重复计入；
 * - 进度不超过 targetValue；
 * - 达到 targetValue 时状态变为 completed。
 *
 * @param instance 当前任务实例
 * @param signal 进度信号
 * @param contributedSources 已经贡献过进度的 source ID 集合
 */
export function reduceTaskProgress(
  instance: DailyTaskInstance,
  signal: TaskProgressSignal,
  contributedSources: Set<string>,
): ProgressReduceResult {
  // 已完成任务不处理
  if (instance.status === 'completed') {
    return { instance, changed: false, justCompleted: false };
  }

  // 未接取任务不处理
  if (instance.status === 'available') {
    return { instance, changed: false, justCompleted: false };
  }

  // 等待天气条件时不处理
  if (instance.status === 'waiting_condition') {
    return { instance, changed: false, justCompleted: false };
  }

  // 防重复 — 同一 sourceId
  if (signal.sourceId && contributedSources.has(signal.sourceId)) {
    return { instance, changed: false, justCompleted: false };
  }

  const newProgress = Math.min(
    instance.progress + signal.amount,
    instance.targetValue,
  );

  if (newProgress === instance.progress) {
    return { instance, changed: false, justCompleted: false };
  }

  // 记录来源
  if (signal.sourceId) {
    contributedSources.add(signal.sourceId);
  }

  const justCompleted = newProgress >= instance.targetValue;

  const updatedInstance: DailyTaskInstance = {
    ...instance,
    progress: newProgress,
    status: justCompleted ? 'completed' : 'active',
    rewardClaimed: justCompleted ? true : instance.rewardClaimed,
  };

  return {
    instance: updatedInstance,
    changed: true,
    justCompleted,
  };
}
