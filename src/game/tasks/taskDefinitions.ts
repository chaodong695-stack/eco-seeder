/**
 * 任务定义配置。
 *
 * 首个任务：清理旧工业区污染物堆。
 */

import type { TaskDefinition } from './taskTypes';

export const TASK_DEFINITIONS: TaskDefinition[] = [
  {
    id: 'task.urban_wasteland.pollution_cleanup_01',
    title: '清理旧工业区污染物堆',
    description: '前往工业区东侧，检查并清理一处污染物堆。',
    giverNpcId: 'npc.engineer.lin',
    targetInteractionId: 'interaction.pollution_zone_01',
    activeObjectiveText: '前往工业区东侧，检查并清理污染物堆',
    objectiveCompletedText: '返回林工处提交任务',
    reward: {
      ecoPoints: 10,
      reputation: 5,
    },
  },
];

/**
 * 根据任务 ID 查找定义。
 */
export function findTaskById(id: string): TaskDefinition | undefined {
  return TASK_DEFINITIONS.find((task) => task.id === id);
}
