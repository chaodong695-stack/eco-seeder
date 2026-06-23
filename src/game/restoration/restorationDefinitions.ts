/**
 * 修复目标定义配置。
 *
 * 持续时间、环境变化值和视觉变化值集中定义在此处，
 * 不散落在 Scene 代码中。
 */

import type { RestorationTargetDefinition } from './restorationTypes';

/** 污染物堆清理默认持续时间（毫秒）。 */
export const POLLUTION_CLEANUP_DURATION_MS = 3000;

/** 污染物堆修复目标定义。 */
export const POLLUTION_ZONE_01_TARGET: RestorationTargetDefinition = {
  id: 'restoration.pollution_zone_01',
  displayName: '污染物堆',
  interactionId: 'interaction.pollution_zone_01',
  taskId: 'task.urban_wasteland.pollution_cleanup_01',
  actionType: 'pollution_cleanup',
  durationMs: POLLUTION_CLEANUP_DURATION_MS,
  interactionRange: 80,
  environmentEffects: [
    {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    },
  ],
  visualStages: [
    {
      stage: 'polluted',
      targetColor: 0x8b4422,
      targetAlpha: 0.7,
      targetScale: 1.0,
      backgroundTint: 0x1a2a2e,
    },
    {
      stage: 'recovering',
      targetColor: 0x6a7a4a,
      targetAlpha: 0.5,
      targetScale: 0.7,
      backgroundTint: 0x1f3028,
    },
  ],
};

/** 所有修复目标定义列表。 */
export const RESTORATION_TARGETS: RestorationTargetDefinition[] = [
  POLLUTION_ZONE_01_TARGET,
];

/**
 * 根据交互对象 ID 查找修复目标定义。
 */
export function findRestorationTargetByInteractionId(
  interactionId: string,
): RestorationTargetDefinition | undefined {
  return RESTORATION_TARGETS.find(
    (t) => t.interactionId === interactionId,
  );
}

/**
 * 根据修复目标 ID 查找定义。
 */
export function findRestorationTargetById(
  id: string,
): RestorationTargetDefinition | undefined {
  return RESTORATION_TARGETS.find((t) => t.id === id);
}
