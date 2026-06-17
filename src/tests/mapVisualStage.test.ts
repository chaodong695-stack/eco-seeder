import { describe, it, expect } from 'vitest';
import { getMapVisualStage, INITIAL_MAP_STATE, V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import type { MapState } from '@/types';

describe('getMapVisualStage', () => {
  it('returns "polluted" for high pollution low recovery state', () => {
    const state: MapState = {
      ...INITIAL_MAP_STATE,
      airPollution: 90,
      waterContamination: 90,
      soilToxicity: 90,
      solidWaste: 90,
      disturbance: 90,
      drainageCapacity: 10,
      habitatSafety: 5,
      infrastructureSafety: 10,
      publicSupport: 10,
      vegetation: 5,
      biodiversity: 5,
      predatorRisk: 50,
      rescueSpeed: 20,
      naturalFood: 10,
    };
    expect(getMapVisualStage(state)).toBe('polluted');
  });

  it('returns "restoring" for moderate recovery state', () => {
    const state: MapState = {
      ...INITIAL_MAP_STATE,
      airPollution: 30,
      waterContamination: 30,
      soilToxicity: 30,
      solidWaste: 30,
      disturbance: 30,
      drainageCapacity: 50,
      habitatSafety: 50,
      infrastructureSafety: 50,
      publicSupport: 50,
      vegetation: 50,
      biodiversity: 50,
      predatorRisk: 20,
      rescueSpeed: 50,
      naturalFood: 40,
    };
    expect(getMapVisualStage(state)).toBe('restoring');
  });

  it('returns "restored" for high recovery low pollution state', () => {
    const state: MapState = {
      ...INITIAL_MAP_STATE,
      airPollution: 10,
      waterContamination: 10,
      soilToxicity: 10,
      solidWaste: 10,
      disturbance: 10,
      drainageCapacity: 80,
      habitatSafety: 80,
      infrastructureSafety: 80,
      publicSupport: 80,
      vegetation: 80,
      biodiversity: 80,
      predatorRisk: 5,
      rescueSpeed: 80,
      naturalFood: 70,
    };
    expect(getMapVisualStage(state)).toBe('restored');
  });
});

describe('V0_1_MAIN_MAP_IDENTITY', () => {
  it('has correct map id', () => {
    expect(V0_1_MAIN_MAP_IDENTITY.id).toBe('map.urban_wasteland');
  });

  it('has correct scene key', () => {
    expect(V0_1_MAIN_MAP_IDENTITY.sceneKey).toBe('UrbanWastelandScene');
  });

  it('has correct display name', () => {
    expect(V0_1_MAIN_MAP_IDENTITY.displayName).toBe('雾港旧工业区');
  });

  it('has correct type', () => {
    expect(V0_1_MAIN_MAP_IDENTITY.type).toBe('urban_wasteland');
  });

  it('has correct primary region id', () => {
    expect(V0_1_MAIN_MAP_IDENTITY.primaryRegionId).toBe(
      'region.industrial_wetland_restoration',
    );
  });
});

describe('INITIAL_MAP_STATE', () => {
  it('all values are within 0-100 range', () => {
    const values = Object.values(INITIAL_MAP_STATE);
    values.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
});
