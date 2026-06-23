/**
 * 任务状态管理 — Zustand Store。
 *
 * 任务状态的唯一事实来源。React UI 和 Phaser 场景均通过此 Store 访问任务状态。
 * 状态流转受 taskStateMachine 约束。
 */

import { create } from 'zustand';
import type { TaskState, TaskStatus, TaskReward } from '@/game/tasks/taskTypes';
import { TASK_DEFINITIONS, findTaskById } from '@/game/tasks/taskDefinitions';
import { canTransition } from '@/game/tasks/taskStateMachine';

interface TaskStoreState {
  /** 所有任务的运行时状态，按 taskId 索引。 */
  tasks: Record<string, TaskState>;
  /** 接取任务。 */
  acceptTask: (taskId: string) => boolean;
  /** 完成任务目标。 */
  completeObjective: (taskId: string, interactionId: string) => boolean;
  /** 提交任务。 */
  submitTask: (taskId: string, npcId: string) => boolean;
  /** 重置所有任务。 */
  resetTasks: () => void;
  /** 获取指定任务的状态。 */
  getTaskStatus: (taskId: string) => TaskStatus | undefined;
  /** 获取指定任务的奖励。 */
  getTaskReward: (taskId: string) => TaskReward | undefined;
  /** 获取指定任务是否已结算奖励。 */
  isRewardClaimed: (taskId: string) => boolean;
}

/**
 * 初始化所有任务为 available 状态。
 */
function createInitialTasks(): Record<string, TaskState> {
  const tasks: Record<string, TaskState> = {};
  for (const def of TASK_DEFINITIONS) {
    tasks[def.id] = {
      taskId: def.id,
      status: 'available',
      currentObjectiveText: '',
      rewardClaimed: false,
    };
  }
  return tasks;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: createInitialTasks(),

  acceptTask: (taskId: string): boolean => {
    const def = findTaskById(taskId);
    if (!def) return false;

    const current = get().tasks[taskId];
    if (!current) return false;

    if (!canTransition(current.status, 'active')) return false;

    set((state) => ({
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...current,
          status: 'active',
          currentObjectiveText: def.activeObjectiveText,
        },
      },
    }));
    return true;
  },

  completeObjective: (taskId: string, interactionId: string): boolean => {
    const def = findTaskById(taskId);
    if (!def) return false;

    // 校验交互对象 ID 匹配
    if (def.targetInteractionId !== interactionId) return false;

    const current = get().tasks[taskId];
    if (!current) return false;

    if (!canTransition(current.status, 'objective_completed')) return false;

    set((state) => ({
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...current,
          status: 'objective_completed',
          currentObjectiveText: def.objectiveCompletedText,
        },
      },
    }));
    return true;
  },

  submitTask: (taskId: string, npcId: string): boolean => {
    const def = findTaskById(taskId);
    if (!def) return false;

    // 校验 NPC ID 与任务发布者一致
    if (def.giverNpcId !== npcId) return false;

    const current = get().tasks[taskId];
    if (!current) return false;

    // 防止重复提交
    if (current.rewardClaimed) return false;

    if (!canTransition(current.status, 'completed')) return false;

    set((state) => ({
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...current,
          status: 'completed',
          rewardClaimed: true,
        },
      },
    }));
    return true;
  },

  resetTasks: (): void => {
    set({ tasks: createInitialTasks() });
  },

  getTaskStatus: (taskId: string): TaskStatus | undefined => {
    return get().tasks[taskId]?.status;
  },

  getTaskReward: (taskId: string): TaskReward | undefined => {
    return findTaskById(taskId)?.reward;
  },

  isRewardClaimed: (taskId: string): boolean => {
    return get().tasks[taskId]?.rewardClaimed ?? false;
  },
}));
