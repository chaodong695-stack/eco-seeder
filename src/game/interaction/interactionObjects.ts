/**
 * 占位交互对象配置。
 *
 * 位置和交互范围集中定义在此处，不散落在场景代码中。
 */

import type { InteractionObjectConfig } from './interactionTypes';

export const INTERACTION_OBJECTS: InteractionObjectConfig[] = [
  {
    id: 'interaction.pollution_zone_01',
    type: 'pollution',
    displayName: '污染物堆',
    x: 600,
    y: 700,
    width: 64,
    height: 64,
    interactionRange: 80,
    feedbackMessage: '已检查污染区域，需要先向林工了解修复任务。',
    color: 0x8b4422,
  },
  {
    id: 'interaction.monitoring_device_01',
    type: 'monitoring_device',
    displayName: '环境监测装置',
    x: 1300,
    y: 500,
    width: 48,
    height: 48,
    interactionRange: 80,
    feedbackMessage: '环境监测装置已启动，正式数据采集将在后续任务中实现。',
    color: 0x4a7a8a,
  },
];
