/**
 * 世界时间服务 — 管理时间快照和低频刷新。
 *
 * 不在 Phaser 每帧重复读取系统时间。
 * 使用低频计时器（每 30 秒）刷新。
 * 同一分钟内不重复发送无意义事件。
 */

import type { DemoTimePreset, TimeMode, WorldTimeSnapshot } from './timeTypes';
import { DEMO_PRESET_MINUTES } from './timeTypes';
import { resolveDayPhase } from './dayPhaseResolver';

/** 时间刷新间隔（毫秒）。 */
export const TIME_REFRESH_INTERVAL_MS = 30_000;

/** 匿名玩家 ID — 不引入真实登录。 */
export const ANONYMOUS_PLAYER_ID = 'anon.player.local.v1';

/** 版本 ID — 用于天气种子。 */
export const VERSION_ID = 'eco-seeder.v0.1';

/**
 * 获取当前设备本地日期字符串（YYYY-MM-DD）。
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取当前设备本地时间的当天分钟数。
 */
export function getLocalMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * 获取时区偏移分钟数。
 */
export function getTimezoneOffsetMinutes(date: Date = new Date()): number {
  return -date.getTimezoneOffset();
}

/**
 * 从设备本地时间生成 WorldTimeSnapshot。
 */
export function createRealtimeSnapshot(date: Date = new Date()): WorldTimeSnapshot {
  const localMinutes = getLocalMinutes(date);
  return {
    mode: 'realtime',
    localDate: getLocalDateString(date),
    localMinutes,
    timezoneOffsetMinutes: getTimezoneOffsetMinutes(date),
    phase: resolveDayPhase(localMinutes),
    demoPreset: null,
  };
}

/**
 * 从演示预设生成 WorldTimeSnapshot。
 *
 * 演示模式只覆盖当前时间阶段，不重新生成另一套天气时间线。
 * 使用当前日期，但分钟数替换为预设代表值。
 */
export function createDemoSnapshot(
  preset: DemoTimePreset,
  date: Date = new Date(),
): WorldTimeSnapshot {
  const minutes = DEMO_PRESET_MINUTES[preset];
  return {
    mode: 'demo',
    localDate: getLocalDateString(date),
    localMinutes: minutes,
    timezoneOffsetMinutes: getTimezoneOffsetMinutes(date),
    phase: resolveDayPhase(minutes),
    demoPreset: preset,
  };
}

/**
 * 根据模式和预设生成时间快照。
 */
export function createSnapshot(
  mode: TimeMode,
  demoPreset: DemoTimePreset | null,
  date: Date = new Date(),
): WorldTimeSnapshot {
  if (mode === 'demo' && demoPreset) {
    return createDemoSnapshot(demoPreset, date);
  }
  return createRealtimeSnapshot(date);
}

/**
 * 判断两个快照是否有有意义的变化（阶段或日期变化）。
 */
export function hasPhaseOrDateChanged(
  prev: WorldTimeSnapshot | null,
  next: WorldTimeSnapshot,
): boolean {
  if (!prev) return true;
  return prev.phase !== next.phase || prev.localDate !== next.localDate;
}

/**
 * 判断两个快照的分钟数是否不同。
 */
export function hasMinutesChanged(
  prev: WorldTimeSnapshot | null,
  next: WorldTimeSnapshot,
): boolean {
  if (!prev) return true;
  return prev.localMinutes !== next.localMinutes;
}

// ─── WorldTimeService — 管理计时器和刷新 ─────────────────

export type TimeSnapshotListener = (snapshot: WorldTimeSnapshot) => void;

/**
 * 世界时间服务。
 *
 * 使用低频计时器刷新，不每帧读取系统时间。
 * 支持实时模式和演示模式切换。
 * 重复初始化保持幂等。
 */
export class WorldTimeService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<TimeSnapshotListener>();
  private currentSnapshot: WorldTimeSnapshot | null = null;
  private mode: TimeMode = 'realtime';
  private demoPreset: DemoTimePreset | null = null;
  private lastEmittedMinute: number = -1;

  /** 初始化时间服务，幂等。 */
  init(mode: TimeMode = 'realtime', demoPreset: DemoTimePreset | null = null): void {
    this.mode = mode;
    this.demoPreset = demoPreset;
    this.currentSnapshot = createSnapshot(mode, demoPreset);
    this.lastEmittedMinute = this.currentSnapshot.localMinutes;
    this.startTimer();
  }

  /** 启动低频计时器（幂等）。 */
  private startTimer(): void {
    if (this.timerId !== null) return;
    this.timerId = setInterval(() => this.refresh(), TIME_REFRESH_INTERVAL_MS);
  }

  /** 刷新时间快照。 */
  refresh(date: Date = new Date()): void {
    const snapshot = createSnapshot(this.mode, this.demoPreset, date);
    this.currentSnapshot = snapshot;

    // 同一分钟内不重复发送
    if (snapshot.localMinutes === this.lastEmittedMinute && this.mode === 'realtime') {
      return;
    }

    this.lastEmittedMinute = snapshot.localMinutes;
    this.notifyListeners(snapshot);
  }

  /** 切换时间模式。 */
  setMode(mode: TimeMode, demoPreset: DemoTimePreset | null = null): void {
    this.mode = mode;
    this.demoPreset = demoPreset;
    const snapshot = createSnapshot(mode, demoPreset);
    this.currentSnapshot = snapshot;
    this.lastEmittedMinute = snapshot.localMinutes;
    this.notifyListeners(snapshot);
  }

  /** 获取当前快照。 */
  getSnapshot(): WorldTimeSnapshot | null {
    return this.currentSnapshot;
  }

  /** 订阅时间变化。 */
  subscribe(listener: TimeSnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 通知所有监听器。 */
  private notifyListeners(snapshot: WorldTimeSnapshot): void {
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[WorldTimeService] listener error:', e);
      }
    });
  }

  /** 销毁服务，清理计时器。 */
  destroy(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.listeners.clear();
    this.currentSnapshot = null;
    this.lastEmittedMinute = -1;
  }

  /** 是否正在运行。 */
  isRunning(): boolean {
    return this.timerId !== null;
  }
}

/** 全局单例 — 保证 React Strict Mode 下不创建两套时间服务。 */
let globalTimeService: WorldTimeService | null = null;

/**
 * 获取全局时间服务单例。
 */
export function getTimeService(): WorldTimeService {
  if (!globalTimeService) {
    globalTimeService = new WorldTimeService();
  }
  return globalTimeService;
}

/**
 * 销毁全局时间服务（用于返回开始页时清理）。
 */
export function destroyTimeService(): void {
  if (globalTimeService) {
    globalTimeService.destroy();
    globalTimeService = null;
  }
}
