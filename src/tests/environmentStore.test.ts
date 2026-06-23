import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEnvironmentStore,
  INITIAL_ENVIRONMENT_STATE,
  resolveVisualStage,
} from '@/store/environmentStore';
import type { EnvironmentEffect } from '@/game/restoration/restorationTypes';

describe('EnvironmentStore', () => {
  beforeEach(() => {
    useEnvironmentStore.getState().resetEnvironment();
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const state = useEnvironmentStore.getState().state;
      expect(state.pollution).toBe(78);
      expect(state.vegetation).toBe(22);
      expect(state.waterQuality).toBe(30);
      expect(state.restorationProgress).toBe(0);
    });

    it('starts with polluted visual stage', () => {
      expect(useEnvironmentStore.getState().visualStage).toBe('polluted');
    });

    it('has no applied effects initially', () => {
      expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(false);
    });
  });

  describe('applyEffect', () => {
    const effect: EnvironmentEffect = {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    };

    it('applies environment changes correctly', () => {
      const result = useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      expect(result).toBe(true);

      const state = useEnvironmentStore.getState().state;
      expect(state.pollution).toBe(78 - 15);
      expect(state.vegetation).toBe(22 + 3);
      expect(state.waterQuality).toBe(30 + 5);
      expect(state.restorationProgress).toBe(0 + 20);
    });

    it('returns false for duplicate application', () => {
      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      const result = useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      expect(result).toBe(false);
    });

    it('does not change state on duplicate application', () => {
      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      const stateAfterFirst = { ...useEnvironmentStore.getState().state };

      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      const stateAfterSecond = { ...useEnvironmentStore.getState().state };

      expect(stateAfterSecond).toEqual(stateAfterFirst);
    });

    it('updates visual stage after effect applied', () => {
      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      expect(useEnvironmentStore.getState().visualStage).toBe('recovering');
    });

    it('marks target as applied after effect', () => {
      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);
      expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(true);
    });
  });

  describe('clamping to 0-100', () => {
    it('clamps pollution to minimum 0', () => {
      const bigReduction: EnvironmentEffect = {
        pollution: -200,
        vegetation: 0,
        waterQuality: 0,
        restorationProgress: 0,
      };
      useEnvironmentStore.getState().applyEffect('target.test_clamp_low', bigReduction);
      expect(useEnvironmentStore.getState().state.pollution).toBe(0);
    });

    it('clamps vegetation to maximum 100', () => {
      const bigIncrease: EnvironmentEffect = {
        pollution: 0,
        vegetation: 200,
        waterQuality: 0,
        restorationProgress: 0,
      };
      useEnvironmentStore.getState().applyEffect('target.test_clamp_high', bigIncrease);
      expect(useEnvironmentStore.getState().state.vegetation).toBe(100);
    });

    it('clamps waterQuality to maximum 100', () => {
      const bigIncrease: EnvironmentEffect = {
        pollution: 0,
        vegetation: 0,
        waterQuality: 200,
        restorationProgress: 0,
      };
      useEnvironmentStore.getState().applyEffect('target.test_clamp_water', bigIncrease);
      expect(useEnvironmentStore.getState().state.waterQuality).toBe(100);
    });

    it('clamps restorationProgress to maximum 100', () => {
      const bigIncrease: EnvironmentEffect = {
        pollution: 0,
        vegetation: 0,
        waterQuality: 0,
        restorationProgress: 200,
      };
      useEnvironmentStore.getState().applyEffect('target.test_clamp_progress', bigIncrease);
      expect(useEnvironmentStore.getState().state.restorationProgress).toBe(100);
    });
  });

  describe('resetEnvironment', () => {
    it('restores initial state', () => {
      const effect: EnvironmentEffect = {
        pollution: -15,
        vegetation: 3,
        waterQuality: 5,
        restorationProgress: 20,
      };
      useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', effect);

      useEnvironmentStore.getState().resetEnvironment();

      const state = useEnvironmentStore.getState().state;
      expect(state).toEqual(INITIAL_ENVIRONMENT_STATE);
      expect(useEnvironmentStore.getState().visualStage).toBe('polluted');
      expect(useEnvironmentStore.getState().isEffectApplied('restoration.pollution_zone_01')).toBe(false);
    });
  });

  describe('resolveVisualStage', () => {
    it('returns polluted when restorationProgress is 0', () => {
      expect(resolveVisualStage({ ...INITIAL_ENVIRONMENT_STATE })).toBe('polluted');
    });

    it('returns recovering when restorationProgress > 0', () => {
      expect(
        resolveVisualStage({
          pollution: 63,
          vegetation: 25,
          waterQuality: 35,
          restorationProgress: 20,
        }),
      ).toBe('recovering');
    });

    it('returns restored when fully restored', () => {
      expect(
        resolveVisualStage({
          pollution: 10,
          vegetation: 90,
          waterQuality: 90,
          restorationProgress: 100,
        }),
      ).toBe('restored');
    });
  });

  describe('multiple different targets', () => {
    it('allows applying effects from different targets', () => {
      const effect1: EnvironmentEffect = {
        pollution: -10,
        vegetation: 2,
        waterQuality: 3,
        restorationProgress: 10,
      };
      const effect2: EnvironmentEffect = {
        pollution: -5,
        vegetation: 1,
        waterQuality: 2,
        restorationProgress: 5,
      };

      const r1 = useEnvironmentStore.getState().applyEffect('target.001', effect1);
      const r2 = useEnvironmentStore.getState().applyEffect('target.002', effect2);

      expect(r1).toBe(true);
      expect(r2).toBe(true);

      const state = useEnvironmentStore.getState().state;
      expect(state.pollution).toBe(78 - 10 - 5);
      expect(state.restorationProgress).toBe(10 + 5);
    });
  });
});
