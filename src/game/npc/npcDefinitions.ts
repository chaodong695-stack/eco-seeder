/**
 * NPC 配置定义。
 *
 * 首个 NPC：林工 — 生态修复工程师。
 * 位置通过配置定义，不散落在场景代码中。
 */

import type { NpcDefinition } from './npcTypes';
import { GROUND_TOP_Y } from '@/game/config/movementConfig';

export const NPC_DEFINITIONS: NpcDefinition[] = [
  {
    id: 'npc.engineer.lin',
    displayName: '林工',
    role: '生态修复工程师',
    x: 350,
    y: GROUND_TOP_Y,
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
    y: GROUND_TOP_Y,
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
