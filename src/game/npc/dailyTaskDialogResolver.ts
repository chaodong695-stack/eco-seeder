/**
 * 每日任务 NPC 对话解析器。
 *
 * 根据 NPC 负责的每日任务状态返回对话内容。
 * 对话内容由配置和任务状态决定，不写死在 React 组件中。
 */

import type { DailyTaskInstance } from '@/domain/tasks/dailyTaskTypes';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { getWaitingWeatherText } from '@/domain/tasks/dailyTaskConditionResolver';
import { WEATHER_DEFINITIONS } from '@/domain/weather/weatherTypes';

/** 每日任务对话选项动作类型。 */
export type DailyTaskDialogAction =
  | 'accept_all'
  | 'accept_one'
  | 'dismiss'
  | 'close';

/** 每日任务对话选项。 */
export interface DailyTaskDialogOption {
  /** 选项文本。 */
  label: string;
  /** 选项动作。 */
  action: DailyTaskDialogAction;
  /** 关联的任务实例 ID（accept_one 时使用）。 */
  instanceId?: string;
}

/** 每日任务对话内容。 */
export interface DailyTaskDialogContent {
  /** NPC 名称。 */
  npcName: string;
  /** NPC 身份。 */
  npcRole: string;
  /** 对话文本（可多行）。 */
  lines: string[];
  /** 可点击选项。 */
  options: DailyTaskDialogOption[];
}

/**
 * 将天气类型列表转为中文显示文本。
 */
function weatherTypesToText(weatherTypes: string[]): string {
  return weatherTypes
    .map((w) => WEATHER_DEFINITIONS[w as keyof typeof WEATHER_DEFINITIONS]?.displayName ?? w)
    .join('、');
}

/**
 * 获取单个任务的描述行。
 */
function getTaskLine(inst: DailyTaskInstance): string {
  const def = findDailyTaskById(inst.taskId);
  if (!def) return '';

  const parts: string[] = [`【${def.title}】`];

  if (inst.status === 'completed') {
    parts.push('已完成 ✓');
  } else if (inst.status === 'available') {
    parts.push('可接取');
    if (def.condition?.supportedWeather) {
      parts.push(`（需${weatherTypesToText(def.condition.supportedWeather)}）`);
    }
  } else if (inst.status === 'waiting_condition') {
    const waitingText = getWaitingWeatherText(def);
    parts.push(`等待天气：${weatherTypesToText(waitingText.split('、'))}`);
  } else if (inst.status === 'active') {
    parts.push(`进度 ${inst.progress}/${inst.targetValue}`);
  }

  return parts.join(' ');
}

/**
 * 根据每日任务状态解析 NPC 对话内容。
 *
 * @param npcName NPC 显示名称
 * @param npcRole NPC 身份
 * @param npcId NPC ID
 * @param tasks 该 NPC 负责的每日任务列表
 * @returns 对话内容
 */
export function resolveDailyTaskDialog(
  npcName: string,
  npcRole: string,
  npcId: string,
  tasks: DailyTaskInstance[],
): DailyTaskDialogContent {
  const lines: string[] = [];
  const options: DailyTaskDialogOption[] = [];

  if (tasks.length === 0) {
    return {
      npcName,
      npcRole,
      lines: ['今日没有分配给我的任务。'],
      options: [{ label: '结束对话', action: 'close' }],
    };
  }

  // 添加每个任务的描述
  for (const inst of tasks) {
    lines.push(getTaskLine(inst));
  }

  const hasAvailable = tasks.some((t) => t.status === 'available');
  const hasActive = tasks.some((t) => t.status === 'active' || t.status === 'waiting_condition');
  const allCompleted = tasks.every((t) => t.status === 'completed');

  if (allCompleted) {
    lines.push('今日的任务都已完成，辛苦了。');
    options.push({ label: '结束对话', action: 'close' });
  } else if (hasAvailable) {
    // 有可接任务 — 提供逐个接取选项
    for (const inst of tasks) {
      if (inst.status === 'available') {
        const def = findDailyTaskById(inst.taskId);
        if (def) {
          options.push({
            label: `接取：${def.title}`,
            action: 'accept_one',
            instanceId: inst.instanceId,
          });
        }
      }
    }
    options.push({ label: '稍后再说', action: 'dismiss' });
  } else if (hasActive) {
    lines.push('完成任务后回来找我。');
    options.push({ label: '我知道了', action: 'close' });
  } else {
    options.push({ label: '结束对话', action: 'close' });
  }

  void npcId;

  return { npcName, npcRole, lines, options };
}
