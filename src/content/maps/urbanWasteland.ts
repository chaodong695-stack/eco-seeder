import type { MapDefinition, MapState, MapVisualStage } from '@/types';

/**
 * v0.1 主地图身份常量。
 *
 * 依据 05_INTERFACE_CONTRACTS.md 3.2 节，
 * 禁止在多个组件中重复硬编码地图名称。
 */
export const V0_1_MAIN_MAP_IDENTITY = {
  id: 'map.urban_wasteland',
  sceneKey: 'UrbanWastelandScene',
  displayName: '雾港旧工业区',
  type: 'urban_wasteland',
  primaryRegionId: 'region.industrial_wetland_restoration',
} as const;

export const PRIMARY_REGION_ID = 'region.industrial_wetland_restoration';
export const PRIMARY_REGION_DISPLAY_NAME = '废弃工业湿地修复区';

/**
 * v0.1 主地图初始污染状态。
 * 所有数值范围 0—100。
 */
export const INITIAL_MAP_STATE: MapState = {
  airPollution: 75,
  waterContamination: 80,
  soilToxicity: 65,
  solidWaste: 70,
  drainageCapacity: 25,
  habitatSafety: 20,
  infrastructureSafety: 30,
  publicSupport: 35,
  vegetation: 15,
  biodiversity: 10,
  disturbance: 60,
  predatorRisk: 45,
  rescueSpeed: 30,
  naturalFood: 20,
};

/**
 * v0.1 主地图定义（骨架）。
 */
export const URBAN_WASTELAND_MAP: MapDefinition = {
  id: V0_1_MAIN_MAP_IDENTITY.id,
  version: 1,
  displayName: V0_1_MAIN_MAP_IDENTITY.displayName,
  type: V0_1_MAIN_MAP_IDENTITY.type,
  description: '雾港旧工业区——一片亟待生态修复的城市污染荒地。',
  sceneKey: V0_1_MAIN_MAP_IDENTITY.sceneKey,
  primaryRegionId: V0_1_MAIN_MAP_IDENTITY.primaryRegionId,
  climateProfileId: 'climate.urban_polluted',
  regions: [
    {
      id: PRIMARY_REGION_ID,
      version: 1,
      displayName: PRIMARY_REGION_DISPLAY_NAME,
      description: '废弃工业湿地修复区，v0.1 主要可玩区域。',
      type: 'wetland',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      interactionPointIds: [],
    },
  ],
  initialState: INITIAL_MAP_STATE,
  dailyTaskPoolIds: [],
  randomTaskPoolIds: [],
  dungeonPoolIds: [],
  npcPoolIds: [],
  rewardPoolId: 'reward_pool.v0_1',
};

/**
 * 依据 MapState 计算视觉阶段。
 * 依据 05_INTERFACE_CONTRACTS.md 3.5 节的派生逻辑。
 */
export function getMapVisualStage(state: MapState): MapVisualStage {
  const pollutionScore =
    state.airPollution +
    state.waterContamination +
    state.soilToxicity +
    state.solidWaste +
    state.disturbance;

  const recoveryScore =
    state.drainageCapacity +
    state.habitatSafety +
    state.infrastructureSafety +
    state.publicSupport +
    state.vegetation +
    state.biodiversity;

  const normalizedScore = recoveryScore / 6 - pollutionScore / 5;

  if (normalizedScore < 0) {
    return 'polluted';
  }

  if (normalizedScore < 50) {
    return 'restoring';
  }

  return 'restored';
}
