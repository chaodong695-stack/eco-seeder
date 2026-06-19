/**
 * 统一的新一局重置逻辑。
 *
 * 覆盖所有与一局游戏相关的临时状态：
 * - dailyTaskStore（每日任务状态、contributedSources）
 * - environmentStore（区域修复进度、污染物堆完成状态、appliedTargetIds）
 * - taskStore（旧任务系统残留状态）
 *
 * 调用时机：
 * 1. 从开始页选择角色进入游戏
 * 2. 返回开始页后重新进入游戏
 * 3. 页面刷新后从开始页重新进入游戏
 * 4. 开始新游戏
 * 5. 开发环境手动 reset
 *
 * 该函数是幂等的，多次调用不会产生副作用。
 * 调用后所有 Store 恢复初始值，localStorage 中相关数据被清除。
 * Scene create 时会重新初始化所需的 Store（如 dailyTaskStore.init）。
 */

import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useTaskStore } from '@/store/taskStore';

/**
 * 重置所有与一局游戏相关的临时状态。
 *
 * 重置范围：
 * - 每日任务状态（tasks, contributedSources, isInitialized）
 * - 区域修复进度（pollution, vegetation, waterQuality, restorationProgress）
 * - 污染物堆完成状态（appliedTargetIds）
 * - 旧任务系统状态（taskStore tasks → available）
 * - localStorage 中对应的持久化数据
 */
export function resetWorldSession(): void {
  // 重置每日任务 — 清除 localStorage + Store 状态 + contributedSources
  useDailyTaskStore.getState().resetDailyTasks();

  // 重置环境状态 — 清除 localStorage + Store 状态 + appliedTargetIds
  useEnvironmentStore.getState().resetEnvironment();

  // 重置旧任务系统 — 防止旧任务残留状态影响场景
  useTaskStore.getState().resetTasks();
}
