/**
 * NPC 对话解析器 — 根据任务状态返回对应对话内容。
 *
 * 对话内容通过配置定义，不写死在 React 组件中。
 * 对话状态由任务状态决定。
 */

import type { TaskStatus } from '@/game/tasks/taskTypes';

/** 对话选项动作类型。 */
export type DialogActionType =
  | 'accept_task'
  | 'submit_task'
  | 'dismiss'
  | 'close';

/** 对话选项。 */
export interface DialogOption {
  /** 选项文本。 */
  label: string;
  /** 选项动作。 */
  action: DialogActionType;
}

/** 对话内容。 */
export interface DialogContent {
  /** NPC 名称。 */
  npcName: string;
  /** NPC 身份。 */
  npcRole: string;
  /** 对话文本（可多行）。 */
  lines: string[];
  /** 可点击选项。 */
  options: DialogOption[];
}

/**
 * 根据任务状态解析 NPC 对话内容。
 *
 * @param npcName NPC 显示名称
 * @param npcRole NPC 身份
 * @param taskStatus 当前任务状态
 * @returns 对话内容
 */
export function resolveDialog(
  npcName: string,
  npcRole: string,
  taskStatus: TaskStatus,
): DialogContent {
  switch (taskStatus) {
    case 'available':
      return {
        npcName,
        npcRole,
        lines: [
          '旧工业区东侧还有一处污染物堆没有完成检查。',
          '请你过去确认并进行临时清理。',
        ],
        options: [
          { label: '接受任务', action: 'accept_task' },
          { label: '暂时不去', action: 'dismiss' },
        ],
      };

    case 'active':
      return {
        npcName,
        npcRole,
        lines: [
          '污染物堆就在工业区东侧。',
          '完成检查后再回来找我。',
        ],
        options: [{ label: '我知道了', action: 'close' }],
      };

    case 'objective_completed':
      return {
        npcName,
        npcRole,
        lines: ['你已经处理完那处污染物堆了吗？'],
        options: [
          { label: '提交任务', action: 'submit_task' },
          { label: '稍后再说', action: 'dismiss' },
        ],
      };

    case 'completed':
      return {
        npcName,
        npcRole,
        lines: [
          '处理得不错。这里的污染扩散风险暂时降低了。',
          '后续我们还需要继续修复这片区域。',
        ],
        options: [{ label: '结束对话', action: 'close' }],
      };

    default: {
      // 穷尽检查 — 确保所有状态都有对应对话
      const _exhaustive: never = taskStatus;
      void _exhaustive;
      return {
        npcName,
        npcRole,
        lines: ['...'],
        options: [{ label: '关闭', action: 'close' }],
      };
    }
  }
}
