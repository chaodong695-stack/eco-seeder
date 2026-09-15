import { sceneAssets } from '@/game/assets/assetManifest';
import type { InteractionObjectConfig } from '@/game/interaction/interactionTypes';
import type { NpcDefinition } from '@/game/npc/npcTypes';

/** Shared full-canvas registration: never crop the individual transparent layers. */
export const DEMO_SCENE = {
  enabled: true,
  width: 1920,
  height: 1080,
  spawn: { x: 1000, y: 920 },
  obstacles: [
    { x: 515, y: 900, width: 170, height: 85, color: 0x65584a },
    { x: 1640, y: 790, width: 180, height: 100, color: 0x65584a },
  ],
} as const;
export const DEMO_LAYERS = [
  { id: 'sky', path: sceneAssets.demo.sky, depth: 0, parallax: 0 },
  { id: 'far-factory', path: sceneAssets.demo.farFactory, depth: 5, parallax: 2 },
  { id: 'factory', path: sceneAssets.demo.factory, depth: 10, parallax: 0 },
  { id: 'pipe', path: sceneAssets.demo.pipe, depth: 15, parallax: 0 },
  { id: 'ground', path: sceneAssets.demo.ground, depth: 20, parallax: 0 },
  { id: 'barrel', path: sceneAssets.demo.barrel, depth: 1190, parallax: 0 },
  { id: 'fence', path: sceneAssets.demo.fence, depth: 1200, parallax: 0 },
  { id: 'smoke', path: sceneAssets.demo.smoke, depth: 25, parallax: 2 },
] as const;

const placements: Record<string, { x: number; y: number }> = {
  'interaction.pollution_zone_01': { x: 730, y: 860 },
  'interaction.monitoring_device_01': { x: 1390, y: 850 },
  'interaction.drainage_facility_01': { x: 1130, y: 790 },
  'interaction.storm_debris_01': { x: 1020, y: 990 },
  'interaction.damaged_env_01': { x: 1160, y: 710 },
  'interaction.damaged_env_02': { x: 1440, y: 740 },
  'interaction.ecology_patrol_01': { x: 640, y: 740 },
  'interaction.ecology_patrol_02': { x: 960, y: 840 },
  'interaction.ecology_patrol_03': { x: 1380, y: 965 },
  'interaction.fog_hazard_01': { x: 820, y: 970 },
  'interaction.fog_hazard_02': { x: 1220, y: 920 },
  'npc.engineer.lin': { x: 870, y: 770 },
  'npc_weather_ranger': { x: 1270, y: 830 },
};

/** Gentle perspective; gameplay speed and physical footprint do not scale. */
export function demoActorHeight(y: number): number {
  return 100 + (Math.max(700, Math.min(1040, y)) - 700) / 340 * 48;
}
export function demoInteractionObjects(source: readonly InteractionObjectConfig[]): InteractionObjectConfig[] {
  return source.map(config => {
    const position = placements[config.id] ?? { x: config.x, y: config.y };
    return { ...config, ...position,
      displayHeight: Math.min(config.displayHeight ?? 90, 115) * demoActorHeight(position.y) / 125,
    };
  });
}
export function demoNpcDefinitions(source: readonly NpcDefinition[]): NpcDefinition[] {
  return source.map(config => ({ ...config, ...placements[config.id] }));
}
