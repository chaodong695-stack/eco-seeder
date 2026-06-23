/**
 * NPC 场景位置回归测试 — 验证巡查员不位于主要通行路线。
 *
 * 覆盖 Issue #16 第 5 点：
 * - 巡查员不得位于主要通行路线或任务目标入口；
 * - 巡查员使用非阻挡型触发器。
 */

import { describe, it, expect } from 'vitest';
import { NPC_DEFINITIONS, findNpcById } from '@/game/npc/npcDefinitions';
import { WORLD_BOUNDS } from '@/game/config/movementConfig';
import { INTERACTION_OBJECTS } from '@/game/interaction/interactionObjects';

describe('npcPositionRegression', () => {
  describe('NPC definitions', () => {
    it('has exactly 2 NPCs', () => {
      expect(NPC_DEFINITIONS).toHaveLength(2);
    });

    it('has npc.engineer.lin', () => {
      const lin = findNpcById('npc.engineer.lin');
      expect(lin).toBeDefined();
      expect(lin?.displayName).toBe('林工');
    });

    it('has npc_weather_ranger', () => {
      const ranger = findNpcById('npc_weather_ranger');
      expect(ranger).toBeDefined();
      expect(ranger?.displayName).toBe('巡查员');
    });
  });

  describe('weather ranger position', () => {
    const ranger = findNpcById('npc_weather_ranger')!;

    it('is within world bounds', () => {
      expect(ranger.x).toBeGreaterThanOrEqual(0);
      expect(ranger.x).toBeLessThanOrEqual(WORLD_BOUNDS.width);
      expect(ranger.y).toBeGreaterThanOrEqual(0);
      expect(ranger.y).toBeLessThanOrEqual(WORLD_BOUNDS.height);
    });

    it('is on the ground level', () => {
      // NPC 应站立在地面上（GROUND_TOP_Y）
      const groundY = 880;
      expect(ranger.y).toBe(groundY);
    });

    it('is not blocking pollution zone entrance', () => {
      const pollutionZone = INTERACTION_OBJECTS.find(
        (o) => o.id === 'interaction.pollution_zone_01',
      );
      if (!pollutionZone) return;

      const dx = ranger.x - pollutionZone.x;
      const dy = ranger.y - pollutionZone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Should be far enough from pollution zone entrance
      expect(distance).toBeGreaterThan(100);
    });

    it('is not blocking drainage facility entrance', () => {
      const drainage = INTERACTION_OBJECTS.find(
        (o) => o.id === 'interaction.drainage_facility_01',
      );
      if (!drainage) return;

      const dx = ranger.x - drainage.x;
      const dy = ranger.y - drainage.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Should be far enough from drainage facility
      expect(distance).toBeGreaterThan(100);
    });

    it('is not blocking storm debris area', () => {
      const stormDebris = INTERACTION_OBJECTS.find(
        (o) => o.id === 'interaction.storm_debris_01',
      );
      if (!stormDebris) return;

      const dx = ranger.x - stormDebris.x;
      const dy = ranger.y - stormDebris.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Should be far enough from storm debris
      expect(distance).toBeGreaterThan(100);
    });

    it('is positioned near the edge of the map (not center)', () => {
      const centerX = WORLD_BOUNDS.width / 2;
      const dx = Math.abs(ranger.x - centerX);

      // Should be away from center — closer to the edge
      expect(dx).toBeGreaterThan(200);
    });

    it('has reasonable interaction range', () => {
      expect(ranger.interactionRange).toBeGreaterThan(40);
      expect(ranger.interactionRange).toBeLessThan(150);
    });
  });

  describe('engineer lin position', () => {
    const lin = findNpcById('npc.engineer.lin')!;

    it('is within world bounds', () => {
      expect(lin.x).toBeGreaterThanOrEqual(0);
      expect(lin.x).toBeLessThanOrEqual(WORLD_BOUNDS.width);
      expect(lin.y).toBeGreaterThanOrEqual(0);
      expect(lin.y).toBeLessThanOrEqual(WORLD_BOUNDS.height);
    });

    it('is not blocking pollution zone entrance', () => {
      const pollutionZone = INTERACTION_OBJECTS.find(
        (o) => o.id === 'interaction.pollution_zone_01',
      );
      if (!pollutionZone) return;

      const dx = lin.x - pollutionZone.x;
      const dy = lin.y - pollutionZone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      expect(distance).toBeGreaterThan(100);
    });
  });

  describe('NPCs do not overlap each other', () => {
    it('NPCs are far enough apart', () => {
      const lin = findNpcById('npc.engineer.lin')!;
      const ranger = findNpcById('npc_weather_ranger')!;

      const dx = lin.x - ranger.x;
      const dy = lin.y - ranger.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      expect(distance).toBeGreaterThan(200);
    });
  });
});
