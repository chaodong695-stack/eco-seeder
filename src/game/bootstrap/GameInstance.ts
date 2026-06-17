import Phaser from 'phaser';
import { createGameConfig } from './gameConfig';
import type { PlayerCharacterGender } from '@/types';

/**
 * Phaser 游戏实例管理器。
 * 负责创建和销毁 Phaser 游戏实例。
 */
export class GameInstance {
  private game: Phaser.Game | null = null;

  mount(parent: HTMLElement, characterGender: PlayerCharacterGender): void {
    if (this.game) {
      this.destroy();
    }

    const config = createGameConfig(parent);
    this.game = new Phaser.Game(config);

    // 传递角色选择信息（占位，后续通过场景数据传递）
    this.game.registry.set('characterGender', characterGender);
  }

  destroy(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  isRunning(): boolean {
    return this.game !== null;
  }
}
