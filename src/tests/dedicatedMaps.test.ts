import { describe, expect, it } from 'vitest';
import { DEDICATED_MAPS, getDedicatedMapConfig } from '@/content/maps/dedicatedMaps';
import { clearDedicatedMapContext, createDedicatedMapContext, getDedicatedMapContext } from '@/game/session/dedicatedMapTransition';
import { INTERACTION_OBJECTS } from '@/game/interaction/interactionObjects';

describe('dedicated map contracts', () => {
  it('defines monitoring and pollution dedicated maps', () => {
    expect(DEDICATED_MAPS.environmentMonitoring).toEqual(expect.objectContaining({
      id: 'map.environment_monitoring_01', sceneKey: 'environment-monitoring', interactionId: 'interaction.monitoring_device_01',
    }));
    expect(DEDICATED_MAPS.pollutionCleanup).toEqual(expect.objectContaining({
      id: 'map.pollution_cleanup_01', sceneKey: 'pollution-cleanup', interactionId: 'interaction.pollution_zone_01',
    }));
  });

  it('resolves known maps and rejects unknown maps', () => {
    expect(getDedicatedMapConfig('map.environment_monitoring_01')?.mapType).toBe('monitoring');
    expect(getDedicatedMapConfig('map.missing')).toBeUndefined();
  });

  it('declares target map ids on the two source interactions', () => {
    expect(INTERACTION_OBJECTS.find(({ id }) => id === 'interaction.monitoring_device_01')?.targetMapId).toBe('map.environment_monitoring_01');
    expect(INTERACTION_OBJECTS.find(({ id }) => id === 'interaction.pollution_zone_01')?.targetMapId).toBe('map.pollution_cleanup_01');
  });

  it('stores and clears a dedicated map context', () => {
    clearDedicatedMapContext();
    const context = createDedicatedMapContext({
      sourceSceneKey: 'UrbanWastelandScene', sourceMapId: 'map.urban_wasteland', interactionId: 'interaction.monitoring_device_01', targetMapId: 'map.environment_monitoring_01', returnPosition: { x: 1500, y: 940 },
    });
    expect(getDedicatedMapContext()).toEqual(context);
    clearDedicatedMapContext();
    expect(getDedicatedMapContext()).toBeNull();
  });
});
