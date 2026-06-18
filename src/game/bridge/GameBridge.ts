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
import type {
  RestorationStartedPayload,
  RestorationProgressPayload,
  RestorationInterruptedPayload,
  RestorationCompletedPayload,
  EnvironmentUpdatedPayload,
  VisualStageChangedPayload,
} from '@/game/restoration/restorationTypes';
import type { WorldTimeSnapshot, DayPhase, TimeMode } from '@/domain/time/timeTypes';
import type { WeatherSnapshot } from '@/domain/weather/weatherTypes_ext';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import type { WeatherTimeline } from '@/domain/weather/weatherTimelineGenerator';

// ─── DEV-03 新增事件 payload ─────────────────────────────

/** NPC 对话打开事件。 */
export interface NpcDialogOpenPayload {
  npcId: string;
  npcName: string;
  npcRole: string;
}

/** NPC 对话关闭事件。 */
export interface NpcDialogClosePayload {
  npcId: string;
}

/** 任务接取事件。 */
export interface TaskAcceptedPayload {
  taskId: string;
  npcId: string;
}

/** 任务目标完成事件。 */
export interface TaskObjectiveCompletedPayload {
  taskId: string;
  interactionId: string;
}

/** 任务提交完成事件。 */
export interface TaskCompletedPayload {
  taskId: string;
  npcId: string;
  reward: { ecoPoints: number; reputation: number };
}

/** 任务反馈消息事件。 */
export interface TaskFeedbackPayload {
  message: string;
}

// ─── DEV-05 新增事件 payload ─────────────────────────────

/** 世界时间变化事件 payload。 */
export interface WorldTimeChangedPayload {
  previous: WorldTimeSnapshot | null;
  current: WorldTimeSnapshot;
}

/** 昼夜阶段变化事件 payload。 */
export interface DayPhaseChangedPayload {
  previousPhase: DayPhase | null;
  currentPhase: DayPhase;
  mode: TimeMode;
  localMinutes: number;
}

/** 天气时间线生成事件 payload。 */
export interface WeatherTimelineGeneratedPayload {
  timeline: WeatherTimeline;
}

/** 天气变化事件 payload（DEV-05 版本）。 */
export interface WeatherChangedPayloadV2 {
  previousWeather: string | null;
  current: WeatherSnapshot;
}

/** 开发天气预览切换事件 payload（仅开发环境）。 */
export interface DevWeatherPreviewPayload {
  weather: WeatherType | null;
}

// ─── DEV-06 新增事件 payload ─────────────────────────────

/** 每日任务生成事件 payload。 */
export interface DailyTasksGeneratedPayload {
  tasks: import('@/domain/tasks/dailyTaskTypes').DailyTaskInstance[];
}

/** 每日任务状态变化事件 payload。 */
export interface DailyTaskStatusChangedPayload {
  instanceId: string;
  taskId: string;
  previousStatus: string;
  currentStatus: string;
}

/** 每日任务进度变化事件 payload。 */
export interface DailyTaskProgressChangedPayload {
  instanceId: string;
  taskId: string;
  progress: number;
  targetValue: number;
}

/** 每日任务完成事件 payload。 */
export interface DailyTaskCompletedPayload {
  instanceId: string;
  taskId: string;
}

/** 每日任务进度信号 payload（由 Phaser Scene 发出）。 */
export interface DailyTaskProgressSignalPayload {
  objectiveType: string;
  amount: number;
  sourceId?: string;
}

export type GameBridgeEventMap = {
  GAME_READY: { mapId: string };
  PLAYER_INTERACT: { targetId: string };
  DUNGEON_STARTED: { dungeonId: string };
  WEATHER_CHANGED: { weather: string };
  MAP_STATE_UPDATED: { summary: string };
  INTERACTION_AVAILABLE: InteractionAvailablePayload;
  INTERACTION_UNAVAILABLE: InteractionUnavailablePayload;
  INTERACTION_TRIGGERED: InteractionTriggeredPayload;
  // DEV-03 新增事件
  NPC_DIALOG_OPEN: NpcDialogOpenPayload;
  NPC_DIALOG_CLOSE: NpcDialogClosePayload;
  TASK_ACCEPTED: TaskAcceptedPayload;
  TASK_OBJECTIVE_COMPLETED: TaskObjectiveCompletedPayload;
  TASK_COMPLETED: TaskCompletedPayload;
  TASK_FEEDBACK: TaskFeedbackPayload;
  // DEV-04 新增事件
  RESTORATION_STARTED: RestorationStartedPayload;
  RESTORATION_PROGRESS: RestorationProgressPayload;
  RESTORATION_INTERRUPTED: RestorationInterruptedPayload;
  RESTORATION_COMPLETED: RestorationCompletedPayload;
  ENVIRONMENT_UPDATED: EnvironmentUpdatedPayload;
  VISUAL_STAGE_CHANGED: VisualStageChangedPayload;
  // DEV-05 新增事件
  WORLD_TIME_CHANGED: WorldTimeChangedPayload;
  DAY_PHASE_CHANGED: DayPhaseChangedPayload;
  WEATHER_TIMELINE_GENERATED: WeatherTimelineGeneratedPayload;
  WEATHER_CHANGED_V2: WeatherChangedPayloadV2;
  // DEV-05 开发天气预览事件（仅开发环境）
  DEV_WEATHER_PREVIEW: DevWeatherPreviewPayload;
  // DEV-06 新增事件
  DAILY_TASKS_GENERATED: DailyTasksGeneratedPayload;
  DAILY_TASK_STATUS_CHANGED: DailyTaskStatusChangedPayload;
  DAILY_TASK_PROGRESS_CHANGED: DailyTaskProgressChangedPayload;
  DAILY_TASK_COMPLETED: DailyTaskCompletedPayload;
  DAILY_TASK_PROGRESS_SIGNAL: DailyTaskProgressSignalPayload;
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
