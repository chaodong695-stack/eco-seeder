/**
 * 音频资源路径配置 — DEV-08 音频播放系统。
 *
 * 所有音频路径统一从此文件引入，禁止在组件中硬编码。
 * 路径与 DEV-07 生成的音频文件位置一致。
 */

export const AUDIO_ASSETS = {
  bgm: {
    startPage: '/assets/audio/bgm/start-page-theme.mp3',
    wasteland: '/assets/audio/bgm/wasteland-ambient.mp3',
  },
  sfx: {
    restoreSuccess: '/assets/audio/sfx/restore-success.mp3',
    taskComplete: '/assets/audio/sfx/task-complete.mp3',
    npcRandomTask: '/assets/audio/sfx/npc-random-task.mp3',
  },
} as const;
