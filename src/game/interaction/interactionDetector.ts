/**
 * 交互检测纯函数 — 便于单元测试。
 */

import type { InteractionObjectConfig } from './interactionTypes';

/**
 * 检查玩家是否在交互对象的触发范围内。
 */
export function isInRange(
  playerX: number,
  playerY: number,
  config: InteractionObjectConfig,
): boolean {
  const dx = playerX - config.x;
  const dy = playerY - config.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= config.interactionRange;
}

/**
 * 找出所有在交互范围内的交互对象。
 */
export function findAvailableInteractions(
  playerX: number,
  playerY: number,
  configs: InteractionObjectConfig[],
): InteractionObjectConfig[] {
  return configs.filter((c) => isInRange(playerX, playerY, c));
}
