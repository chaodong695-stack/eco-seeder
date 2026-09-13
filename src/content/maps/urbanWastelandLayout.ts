import type { InteractionObjectConfig } from '@/game/interaction/interactionTypes';
import type { SceneObjectConfig } from '@/game/visual/sceneObjectTypes';

export interface DecorPlacement { readonly id: string; readonly x: number; readonly baseY: number; readonly visibleHeight: number; readonly enabled: boolean; }
export const DECOR_PLACEMENTS = [
  { id: 'decor.cluster.left', x: 170, baseY: 990, visibleHeight: 150, enabled: true },
  { id: 'decor.cluster.center', x: 1000, baseY: 745, visibleHeight: 130, enabled: false },
  { id: 'decor.cluster.right', x: 1780, baseY: 980, visibleHeight: 160, enabled: true },
] as const satisfies readonly DecorPlacement[];
export function enabledDecorIds(): string[] { return DECOR_PLACEMENTS.filter((p) => p.enabled).map((p) => p.id); }
export function getEnabledDecorPlacements(): readonly DecorPlacement[] { return DECOR_PLACEMENTS.filter((p) => p.enabled); }

export const MID_LAYER_PLACEMENT = { x: 960, baseY: 710, scrollX: 0.48, scrollY: 1 } as const;
export const PRIMARY_ROUTE = { left: 820, right: 1100, top: 730, bottom: 1010 } as const;

export function isRequiredInteraction(config: InteractionObjectConfig): boolean {
  return config.id === 'interaction.pollution_zone_01' || config.id === 'interaction.ecology_patrol_01';
}

export const POLLUTION_LAYOUT: SceneObjectConfig = {
  id: 'interaction.pollution_zone_01', role: 'entity', x: 650, baseY: 880, visibleHeight: 120,
  assetId: 'obj-pollution-pile-large', footprint: { width: 64, height: 24, blocking: false },
  shadow: { width: 92, height: 16 }, labelMode: 'proximity',
};

export const SCENE_OBJECT_LAYOUTS: readonly SceneObjectConfig[] = [
  POLLUTION_LAYOUT,
  { id: 'interaction.monitoring_device_01', role: 'entity', x: 1500, baseY: 940, visibleHeight: 140, shadow: { width: 48, height: 12 }, labelMode: 'proximity' },
  { id: 'interaction.drainage_facility_01', role: 'entity', x: 1150, baseY: 900, visibleHeight: 130, shadow: { width: 48, height: 12 }, labelMode: 'proximity' },
  { id: 'interaction.storm_debris_01', role: 'taskMarker', x: 900, baseY: 920, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.damaged_env_01', role: 'taskMarker', x: 450, baseY: 800, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.damaged_env_02', role: 'taskMarker', x: 1350, baseY: 920, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.ecology_patrol_01', role: 'taskMarker', x: 250, baseY: 760, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.ecology_patrol_02', role: 'taskMarker', x: 1050, baseY: 880, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.ecology_patrol_03', role: 'taskMarker', x: 1650, baseY: 860, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.fog_hazard_01', role: 'taskMarker', x: 800, baseY: 820, visibleHeight: 48, labelMode: 'proximity' },
  { id: 'interaction.fog_hazard_02', role: 'taskMarker', x: 1550, baseY: 960, visibleHeight: 48, labelMode: 'proximity' },
];