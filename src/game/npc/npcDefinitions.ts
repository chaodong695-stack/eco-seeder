/**
 * NPC 配置定义。
 *
 * 首个 NPC：林工 — 生态修复工程师。
 * 位置通过配置定义，不散落在场景代码中。
 * 2.5D 改造：y 值在可行走纵深带 [WALKABLE_Y_MIN=700, WALKABLE_Y_MAX=1040] 内，
 * 配合 Y-sort 深度产生前后遮挡关系。
 */

import type { NpcDefinition } from './npcTypes';

export const NPC_DEFINITIONS: NpcDefinition[] = [
  {
    id: 'npc.engineer.lin',
    displayName: '林工',
    role: '生态修复工程师',
    x: 350,
    y: 860,
    width: 32,
    height: 48,
    interactionRange: 80,
    color: 0xf5b942,
  },
  {
    id: 'npc_weather_ranger',
    displayName: '巡查员',
    role: '环境巡查员',
    x: 1700,
    y: 920,
    width: 32,
    height: 48,
    interactionRange: 80,
    color: 0x4a9eff,
  },
];

/**
 * 根据 NPC ID 查找配置。
 */
export function findNpcById(id: string): NpcDefinition | undefined {
  return NPC_DEFINITIONS.find((npc) => npc.id === id);
}
