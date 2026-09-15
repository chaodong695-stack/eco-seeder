import type { DedicatedMapContext } from '@/game/session/dedicatedMapTransition';

export type DedicatedMapType = 'monitoring' | 'pollution-cleanup';

export interface DedicatedMapDefinition {
  id: string;
  sceneKey: string;
  displayName: string;
  mapType: DedicatedMapType;
  interactionId: string;
  entryPosition: { x: number; y: number };
  placeholder: boolean;
}

export const DEDICATED_MAPS = {
  environmentMonitoring: {
    id: 'map.environment_monitoring_01',
    sceneKey: 'environment-monitoring',
    displayName: '环境监测区',
    mapType: 'monitoring',
    interactionId: 'interaction.monitoring_device_01',
    entryPosition: { x: 960, y: 650 },
    placeholder: true,
  },
  pollutionCleanup: {
    id: 'map.pollution_cleanup_01',
    sceneKey: 'pollution-cleanup',
    displayName: '污染物处理区',
    mapType: 'pollution-cleanup',
    interactionId: 'interaction.pollution_zone_01',
    entryPosition: { x: 960, y: 650 },
    placeholder: true,
  },
} as const satisfies Record<string, DedicatedMapDefinition>;

const mapsById = new Map<string, DedicatedMapDefinition>(Object.values(DEDICATED_MAPS).map((map) => [map.id, map]));

export function getDedicatedMapConfig(mapId: string): DedicatedMapDefinition | undefined {
  return mapsById.get(mapId);
}

export function getDedicatedMapForContext(context: DedicatedMapContext): DedicatedMapDefinition | undefined {
  return getDedicatedMapConfig(context.targetMapId);
}
