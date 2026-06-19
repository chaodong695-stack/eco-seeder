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
