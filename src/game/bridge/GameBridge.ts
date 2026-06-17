/**
 * Phaser—React 事件桥接。
 *
 * 依据 04_TECHNICAL_ARCHITECTURE.md 第 4 节和 05_INTERFACE_CONTRACTS.md 第 13 节。
 * 使用类型安全的 Event Bus，不允许组件直接访问 Phaser 内部对象。
 */

import type {
  InteractionAvailablePayload,
  InteractionTriggeredPayload,
  InteractionUnavailablePayload,
} from '@/game/interaction/interactionTypes';

export type GameBridgeEventMap = {
  GAME_READY: { mapId: string };
  PLAYER_INTERACT: { targetId: string };
  NPC_DIALOG_OPEN: { npcId: string };
  TASK_PROGRESS: { taskId: string; progress: number };
  DUNGEON_STARTED: { dungeonId: string };
  WEATHER_CHANGED: { weather: string };
  MAP_STATE_UPDATED: { summary: string };
  INTERACTION_AVAILABLE: InteractionAvailablePayload;
  INTERACTION_UNAVAILABLE: InteractionUnavailablePayload;
  INTERACTION_TRIGGERED: InteractionTriggeredPayload;
};

type EventHandler<T = unknown> = (payload: T) => void;

class GameBridge {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on<K extends keyof GameBridgeEventMap>(
    event: K,
    handler: EventHandler<GameBridgeEventMap[K]>,
  ): () => void {
    const key = event as string;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler as EventHandler);

    return () => {
      this.handlers.get(key)?.delete(handler as EventHandler);
    };
  }

  emit<K extends keyof GameBridgeEventMap>(event: K, payload: GameBridgeEventMap[K]): void {
    const key = event as string;
    this.handlers.get(key)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (e) {
        console.error(`[GameBridge] handler error for ${key}:`, e);
      }
    });
  }

  off<K extends keyof GameBridgeEventMap>(
    event: K,
    handler: EventHandler<GameBridgeEventMap[K]>,
  ): void {
    const key = event as string;
    this.handlers.get(key)?.delete(handler as EventHandler);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const gameBridge = new GameBridge();
