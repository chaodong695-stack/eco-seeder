import type { InteractionObjectConfig } from './interactionTypes';
import { POLLUTION_LAYOUT, SCENE_OBJECT_LAYOUTS } from '@/content/maps/urbanWastelandLayout';
import { interactionPosition } from '@/game/visual/sceneObjectTypes';

export const SCENE_TEXTURE_KEYS = {
  pollutionPileLarge: 'obj-pollution-pile-large',
  restoredPlantsLarge: 'obj-restored-plants-large',
  drainageFacilityDamaged: 'obj-drainage-facility-damaged',
  environmentMonitorDevice: 'obj-environment-monitor-device',
} as const;

const layoutById = new Map(SCENE_OBJECT_LAYOUTS.map((layout) => [layout.id, layout]));
const positionFor = (id: string, fallback: { x: number; y: number }) => {
  const layout = layoutById.get(id);
  return layout ? interactionPosition(layout) : fallback;
};

export const INTERACTION_OBJECTS: InteractionObjectConfig[] = [
  {
    id: 'interaction.pollution_zone_01', type: 'pollution', displayName: '污染物堆',
    targetMapId: 'map.pollution_cleanup_01',
    ...interactionPosition(POLLUTION_LAYOUT), width: 64, height: 64, interactionRange: 90,
    feedbackMessage: '已检查污染区域，需要先向林工了解修复任务。', color: 0x8b4422,
    textureKey: SCENE_TEXTURE_KEYS.pollutionPileLarge, restoredTextureKey: SCENE_TEXTURE_KEYS.restoredPlantsLarge, displayHeight: 120,
  },
  {
    id: 'interaction.monitoring_device_01', type: 'monitoring_device', displayName: '环境监测装置',
    targetMapId: 'map.environment_monitoring_01',
    ...positionFor('interaction.monitoring_device_01', { x: 1500, y: 940 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '环境监测装置已启动，正式数据采集将在后续任务中实现。', color: 0x4a7a8a,
    textureKey: SCENE_TEXTURE_KEYS.environmentMonitorDevice, displayHeight: 140,
  },
  {
    id: 'interaction.drainage_facility_01', type: 'monitoring_device', displayName: '排水设施',
    ...positionFor('interaction.drainage_facility_01', { x: 1150, y: 900 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '排水设施需要在小雨或暴雨时检查。', color: 0x3a6a7a,
    textureKey: SCENE_TEXTURE_KEYS.drainageFacilityDamaged, displayHeight: 130,
  },
  {
    id: 'interaction.storm_debris_01', type: 'pollution', displayName: '暴雨冲散垃圾',
    ...positionFor('interaction.storm_debris_01', { x: 900, y: 920 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '暴雨冲散了大量垃圾，需要在暴雨时清理。', color: 0x6a3a2a,
  },
  {
    id: 'interaction.damaged_env_01', type: 'damaged_environment', displayName: '受损环境点',
    ...positionFor('interaction.damaged_env_01', { x: 450, y: 800 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '受损环境点 — 按 E 修复', color: 0x6a4a3a,
  },
  {
    id: 'interaction.damaged_env_02', type: 'damaged_environment', displayName: '受损环境点',
    ...positionFor('interaction.damaged_env_02', { x: 1350, y: 920 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '受损环境点 — 按 E 修复', color: 0x6a4a3a,
  },
  {
    id: 'interaction.ecology_patrol_01', type: 'ecology_patrol_point', displayName: '生态巡查点',
    ...positionFor('interaction.ecology_patrol_01', { x: 250, y: 760 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '生态巡查点 — 按 E 记录', color: 0x4a7a4a,
  },
  {
    id: 'interaction.ecology_patrol_02', type: 'ecology_patrol_point', displayName: '生态巡查点',
    ...positionFor('interaction.ecology_patrol_02', { x: 1050, y: 880 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '生态巡查点 — 按 E 记录', color: 0x4a7a4a,
  },
  {
    id: 'interaction.ecology_patrol_03', type: 'ecology_patrol_point', displayName: '生态巡查点',
    ...positionFor('interaction.ecology_patrol_03', { x: 1650, y: 860 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '生态巡查点 — 按 E 记录', color: 0x4a7a4a,
  },
  {
    id: 'interaction.fog_hazard_01', type: 'fog_hazard_point', displayName: '雾天危险点',
    ...positionFor('interaction.fog_hazard_01', { x: 800, y: 820 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '雾天危险点 — 按 E 标记', color: 0x8a8a9a,
  },
  {
    id: 'interaction.fog_hazard_02', type: 'fog_hazard_point', displayName: '雾天危险点',
    ...positionFor('interaction.fog_hazard_02', { x: 1550, y: 960 }), width: 48, height: 48, interactionRange: 80,
    feedbackMessage: '雾天危险点 — 按 E 标记', color: 0x8a8a9a,
  },
];
