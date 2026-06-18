import Phaser from 'phaser';
import { createGameConfig } from './gameConfig';
import type { PlayerCharacterGender } from '@/types';
import { gameBridge } from '../bridge/GameBridge';

/**
 * Phaser 游戏实例管理器。
 * 负责创建和销毁 Phaser 游戏实例。
 * 确保 React Strict Mode 下不会出现重复实例和残留监听。
 */
export class GameInstance {
  private game: Phaser.Game | null = null;

  mount(parent: HTMLElement, characterGender: PlayerCharacterGender): void {
    // 如果已有实例，先销毁
    if (this.game) {
      this.destroy();
    }

    // 清理可能残留的桥接事件 — 必须在创建新 Game 之前执行
    // 防止 React Strict Mode 下旧 Scene 的 create() 延迟执行后注册残留 handler
    gameBridge.clear();

    const config = createGameConfig(parent);
    this.game = new Phaser.Game(config);

    // 传递角色选择信息（占位，后续通过场景数据传递）
    this.game.registry.set('characterGender', characterGender);
  }

  destroy(): void {
    if (this.game) {
      // 销毁前先注销所有 GameBridge 事件，防止 destroy 过程中
      // 旧 handler 响应事件并操作已销毁的 Phaser 对象
      gameBridge.clear();
      this.game.destroy(true);
      this.game = null;
    } else {
      // 即使没有 game 实例，也要清理可能残留的桥接事件
      gameBridge.clear();
    }
  }

  isRunning(): boolean {
    return this.game !== null;
  }
}
