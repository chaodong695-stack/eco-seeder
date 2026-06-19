/**
 * 统一资源清单 — DEV-06 美术与音频素材路径入口。
 *
 * 所有图片和音频路径从此文件引入，
 * 禁止在组件中分散硬编码素材路径。
 *
 * 当人工替换正式素材时，只需更新文件本身，
 * 代码引用路径不变。
 */

export const imageAssets = {
  backgrounds: {
    start: '/assets/images/backgrounds/start-bg.png',
  },
  characters: {
    male: '/assets/images/characters/repairer-male.png',
    female: '/assets/images/characters/repairer-female.png',
  },
  objects: {
    pollutionPile: '/assets/images/objects/pollution-pile.png',
    restoredPlants: '/assets/images/objects/restored-plants.png',
  },
} as const;

/**
 * 主场景素材路径 — DEV-06 第二轮：真实美术图片素材。
 *
 * 包含背景、地面纹理、角色侧视图、交互物件图片和装饰层。
 * 所有组件和 Phaser 场景从此统一引用，禁止分散硬编码路径。
 */
export const sceneAssets = {
  backgrounds: {
    industrialWasteland: '/assets/images/backgrounds/industrial-wasteland-bg.png',
  },
  tiles: {
    crackedGround: '/assets/images/tiles/cracked-ground-tile.png',
  },
  characters: {
    maleSide: '/assets/images/characters/repairer-male-side.png',
    femaleSide: '/assets/images/characters/repairer-female-side.png',
  },
  objects: {
    pollutionPileLarge: '/assets/images/objects/pollution-pile-large.png',
    restoredPlantsLarge: '/assets/images/objects/restored-plants-large.png',
    drainageFacilityDamaged: '/assets/images/objects/drainage-facility-damaged.png',
    environmentMonitorDevice: '/assets/images/objects/environment-monitor-device.png',
  },
  decor: {
    ruinPlantCluster: '/assets/images/decor/ruin-plant-cluster.png',
    industrialRuinsStrip: '/assets/images/decor/industrial-ruins-strip.png',
  },
} as const;

export const audioAssets = {
  bgm: {
    start: '/assets/audio/bgm/start-theme.mp3',
    game: '/assets/audio/bgm/game-ambient.mp3',
  },
  sfx: {
    click: '/assets/audio/sfx/click.mp3',
    select: '/assets/audio/sfx/select.mp3',
    taskComplete: '/assets/audio/sfx/task-complete.mp3',
    repairComplete: '/assets/audio/sfx/repair-complete.mp3',
    warning: '/assets/audio/sfx/warning.mp3',
  },
} as const;
