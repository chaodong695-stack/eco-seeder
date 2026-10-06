import Phaser from 'phaser';
import { UrbanWastelandScene } from '@/game/scenes/UrbanWastelandScene';
import { EnvironmentRepairScene } from '@/game/scenes/EnvironmentRepairScene';
import { EnvironmentMonitoringScene } from '@/game/scenes/EnvironmentMonitoringScene';
import { PollutionCleanupScene } from '@/game/scenes/PollutionCleanupScene';

/**
 * Phaser 游戏配置�?
 *
 * 依据 04_TECHNICAL_ARCHITECTURE.md�?
 * - 使用 Phaser 3 二维场景�?
 * - 不使�?Three.js 或真�?3D 技术；
 * - 2.5D 仅为视觉表现�?
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1920,
    height: 1080,
    backgroundColor: '#081417',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [UrbanWastelandScene, EnvironmentRepairScene, EnvironmentMonitoringScene, PollutionCleanupScene],
  };
}
