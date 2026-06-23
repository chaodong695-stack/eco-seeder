import { describe, it, expect } from 'vitest';
import {
  POLLUTION_CLEANUP_DURATION_MS,
  POLLUTION_ZONE_01_TARGET,
  RESTORATION_TARGETS,
  findRestorationTargetByInteractionId,
  findRestorationTargetById,
} from '@/game/restoration/restorationDefinitions';

describe('RestorationDefinitions', () => {
  describe('POLLUTION_CLEANUP_DURATION_MS', () => {
    it('is 3000 milliseconds', () => {
      expect(POLLUTION_CLEANUP_DURATION_MS).toBe(3000);
    });
  });

  describe('POLLUTION_ZONE_01_TARGET', () => {
    it('has correct id', () => {
      expect(POLLUTION_ZONE_01_TARGET.id).toBe('restoration.pollution_zone_01');
    });

    it('has correct interaction id', () => {
      expect(POLLUTION_ZONE_01_TARGET.interactionId).toBe('interaction.pollution_zone_01');
    });

    it('has correct task id', () => {
      expect(POLLUTION_ZONE_01_TARGET.taskId).toBe('task.urban_wasteland.pollution_cleanup_01');
    });

    it('has pollution_cleanup action type', () => {
      expect(POLLUTION_ZONE_01_TARGET.actionType).toBe('pollution_cleanup');
    });

    it('has 3000ms duration', () => {
      expect(POLLUTION_ZONE_01_TARGET.durationMs).toBe(3000);
    });

    it('has environment effects', () => {
      expect(POLLUTION_ZONE_01_TARGET.environmentEffects).toHaveLength(1);
      const effect = POLLUTION_ZONE_01_TARGET.environmentEffects[0];
      expect(effect.pollution).toBe(-15);
      expect(effect.vegetation).toBe(3);
      expect(effect.waterQuality).toBe(5);
      expect(effect.restorationProgress).toBe(20);
    });

    it('has visual stages', () => {
      expect(POLLUTION_ZONE_01_TARGET.visualStages).toHaveLength(2);
      expect(POLLUTION_ZONE_01_TARGET.visualStages[0].stage).toBe('polluted');
      expect(POLLUTION_ZONE_01_TARGET.visualStages[1].stage).toBe('recovering');
    });

    it('has interaction range', () => {
      expect(POLLUTION_ZONE_01_TARGET.interactionRange).toBe(80);
    });
  });

  describe('RESTORATION_TARGETS', () => {
    it('contains pollution zone target', () => {
      expect(RESTORATION_TARGETS).toContain(POLLUTION_ZONE_01_TARGET);
    });
  });

  describe('findRestorationTargetByInteractionId', () => {
    it('finds target by interaction id', () => {
      const target = findRestorationTargetByInteractionId('interaction.pollution_zone_01');
      expect(target).toBeDefined();
      expect(target!.id).toBe('restoration.pollution_zone_01');
    });

    it('returns undefined for unknown interaction id', () => {
      expect(findRestorationTargetByInteractionId('unknown')).toBeUndefined();
    });
  });

  describe('findRestorationTargetById', () => {
    it('finds target by id', () => {
      const target = findRestorationTargetById('restoration.pollution_zone_01');
      expect(target).toBeDefined();
      expect(target!.interactionId).toBe('interaction.pollution_zone_01');
    });

    it('returns undefined for unknown id', () => {
      expect(findRestorationTargetById('unknown')).toBeUndefined();
    });
  });
});
