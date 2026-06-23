/**
 * 任务目标映射测试 — 验证每个进入正式生成池的每日任务都有对应的场景交互对象。
 *
 * 覆盖 Issue #16 第 2、4 点：
 * - daily_restore_area 有明确的场景交互对象（受损环境点）；
 * - 所有任务与场景 objective source 的映射；
 * - 不可完成的任务不会进入生成池。
 */

import { describe, it, expect } from 'vitest';
import {
  DAILY_TASK_DEFINITIONS,
  TASK_OBJECTIVE_SOURCE_MAP,
  hasObjectiveSource,
  getObjectiveSources,
  getCompletableTaskDefinitions,
} from '@/domain/tasks/dailyTaskDefinitions';
import { INTERACTION_OBJECTS } from '@/game/interaction/interactionObjects';

describe('Task objective source mapping', () => {
  describe('every daily task has objective sources', () => {
    for (const def of DAILY_TASK_DEFINITIONS) {
      it(`task "${def.id}" (objectiveType: ${def.objectiveType}) has objective sources`, () => {
        expect(hasObjectiveSource(def)).toBe(true);
        const sources = getObjectiveSources(def);
        expect(sources.length).toBeGreaterThan(0);
      });
    }
  });

  describe('objective source IDs exist as interaction objects', () => {
    const interactionIds = new Set(INTERACTION_OBJECTS.map((o) => o.id));

    for (const [objectiveType, sourceIds] of Object.entries(TASK_OBJECTIVE_SOURCE_MAP)) {
      it(`all source IDs for "${objectiveType}" exist in INTERACTION_OBJECTS`, () => {
        for (const sourceId of sourceIds) {
          expect(interactionIds.has(sourceId)).toBe(true);
        }
      });
    }
  });

  describe('target value matches number of interaction objects', () => {
    it('daily_collect_waste target ≤ number of pollution zone objects', () => {
      const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === 'daily_collect_waste')!;
      const sources = TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType];
      expect(def.targetValue).toBeLessThanOrEqual(sources.length);
    });

    it('daily_restore_area target ≤ number of damaged env objects', () => {
      const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === 'daily_restore_area')!;
      const sources = TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType];
      expect(def.targetValue).toBeLessThanOrEqual(sources.length);
    });

    it('daily_ecology_patrol target ≤ number of patrol points', () => {
      const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === 'daily_ecology_patrol')!;
      const sources = TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType];
      expect(def.targetValue).toBeLessThanOrEqual(sources.length);
    });

    it('daily_fog_hazard_marking target ≤ number of fog hazard points', () => {
      const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === 'daily_fog_hazard_marking')!;
      const sources = TASK_OBJECTIVE_SOURCE_MAP[def.objectiveType];
      expect(def.targetValue).toBeLessThanOrEqual(sources.length);
    });
  });

  describe('getCompletableTaskDefinitions returns all tasks', () => {
    it('returns all 6 task definitions (all have interaction objects)', () => {
      const completable = getCompletableTaskDefinitions();
      expect(completable.length).toBe(DAILY_TASK_DEFINITIONS.length);
    });

    it('includes daily_restore_area', () => {
      const completable = getCompletableTaskDefinitions();
      expect(completable.some((d) => d.id === 'daily_restore_area')).toBe(true);
    });

    it('includes daily_ecology_patrol', () => {
      const completable = getCompletableTaskDefinitions();
      expect(completable.some((d) => d.id === 'daily_ecology_patrol')).toBe(true);
    });

    it('includes daily_fog_hazard_marking', () => {
      const completable = getCompletableTaskDefinitions();
      expect(completable.some((d) => d.id === 'daily_fog_hazard_marking')).toBe(true);
    });
  });

  describe('damaged environment points exist', () => {
    it('has at least 2 damaged environment points', () => {
      const damagedEnvs = INTERACTION_OBJECTS.filter(
        (o) => o.type === 'damaged_environment',
      );
      expect(damagedEnvs.length).toBeGreaterThanOrEqual(2);
    });

    it('damaged environment points have unique IDs', () => {
      const damagedEnvs = INTERACTION_OBJECTS.filter(
        (o) => o.type === 'damaged_environment',
      );
      const ids = new Set(damagedEnvs.map((o) => o.id));
      expect(ids.size).toBe(damagedEnvs.length);
    });

    it('damaged environment points have display name "受损环境点"', () => {
      const damagedEnvs = INTERACTION_OBJECTS.filter(
        (o) => o.type === 'damaged_environment',
      );
      for (const env of damagedEnvs) {
        expect(env.displayName).toBe('受损环境点');
      }
    });
  });

  describe('ecology patrol points exist', () => {
    it('has at least 3 patrol points', () => {
      const patrolPoints = INTERACTION_OBJECTS.filter(
        (o) => o.type === 'ecology_patrol_point',
      );
      expect(patrolPoints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('fog hazard points exist', () => {
    it('has at least 2 fog hazard points', () => {
      const fogPoints = INTERACTION_OBJECTS.filter(
        (o) => o.type === 'fog_hazard_point',
      );
      expect(fogPoints.length).toBeGreaterThanOrEqual(2);
    });
  });
});
