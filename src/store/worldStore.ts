/**
 * 世界状态管理 — Zustand Store。
 *
 * 时间快照和天气快照的唯一事实来源。
 * React UI 通过 hook 订阅。
 * Phaser 通过 getState() 获取低频快照。
 * 提供明确初始化、更新和重置动作。
 * 返回开始页后清理计时器和临时状态。
 * 重复初始化保持幂等。
 */

import { create } from 'zustand';
import type { WorldTimeSnapshot } from '@/domain/time/timeTypes';
import type { DemoTimePreset, TimeMode } from '@/domain/time/timeTypes';
import type { WeatherSnapshot } from '@/domain/weather/weatherTypes_ext';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import type { WeatherTimeline } from '@/domain/weather/weatherTimelineGenerator';
import {
  getTimeService,
  destroyTimeService,
  createSnapshot,
  type TimeSnapshotListener,
} from '@/domain/time/worldTimeService';
import { ANONYMOUS_PLAYER_ID, VERSION_ID } from '@/domain/time/worldTimeService';
import { getWeatherProfile } from '@/content/weather/urbanWastelandWeatherProfile';
import { generateWeatherTimeline, validateTimeline } from '@/domain/weather/weatherTimelineGenerator';
import { resolveCurrentWeather, isWeatherChanged } from '@/domain/weather/currentWeatherResolver';
import { hasPhaseOrDateChanged } from '@/domain/time/worldTimeService';

/** 固定地图 ID。 */
const MAP_ID = 'map.urban_wasteland';

/** 安全初始时间快照。 */
const INITIAL_TIME_SNAPSHOT: WorldTimeSnapshot = {
  mode: 'realtime',
  localDate: '1970-01-01',
  localMinutes: 0,
  timezoneOffsetMinutes: 0,
  phase: 'night',
  demoPreset: null,
};

/** 安全初始天气快照。 */
const INITIAL_WEATHER_SNAPSHOT: WeatherSnapshot = {
  date: '1970-01-01',
  mapId: MAP_ID,
  weather: 'clear',
  displayName: '晴朗',
  intensity: 0.2,
  visibility: 1.0,
  timelineEntryId: 'initial',
};

interface WorldStoreState {
  /** 当前时间快照。 */
  timeSnapshot: WorldTimeSnapshot;
  /** 当前天气快照。 */
  weatherSnapshot: WeatherSnapshot;
  /** 当前天气时间线。 */
  timeline: WeatherTimeline | null;
  /** 时间服务是否已初始化。 */
  isInitialized: boolean;
  /**
   * 开发环境天气预览覆盖（仅 `import.meta.env.DEV` 为 true 时使用）。
   *
   * 不修改正式天气时间线，退出预览后恢复 `weatherSnapshot`。
   */
  devWeatherPreview: WeatherType | null;

  /** 初始化世界状态（幂等）。 */
  init: (mode?: TimeMode, demoPreset?: DemoTimePreset | null) => void;
  /** 设置时间模式。 */
  setTimeMode: (mode: TimeMode, demoPreset?: DemoTimePreset | null) => void;
  /** 刷新时间快照（由计时器调用）。 */
  refreshTime: () => void;
  /** 重置世界状态到安全初始值。 */
  resetWorld: () => void;

  /** 设置开发天气预览（不修改正式时间线）。 */
  setDevWeatherPreview: (weather: WeatherType | null) => void;
  /** 退出开发天气预览，恢复正式天气。 */
  exitDevWeatherPreview: () => void;

  /** 获取当前时间快照（只读）。 */
  getCurrentWorldTime: () => WorldTimeSnapshot;
  /** 获取当前天气快照（只读）。 */
  getCurrentWeather: () => WeatherSnapshot;
  /** 获取天气时间线（只读）。 */
  getWeatherTimeline: () => WeatherTimeline | null;
  /** 获取当前实际显示的天气（预览优先，只读）。 */
  getDisplayWeather: () => WeatherType;
}

let timeListener: (() => void) | null = null;

/**
 * 生成天气时间线。
 */
function buildTimeline(localDate: string): WeatherTimeline {
  const profile = getWeatherProfile(MAP_ID);
  const timeline = generateWeatherTimeline(
    {
      anonymousPlayerId: ANONYMOUS_PLAYER_ID,
      localDate,
      mapId: MAP_ID,
      versionId: VERSION_ID,
    },
    profile,
  );
  validateTimeline(timeline);
  return timeline;
}

export const useWorldStore = create<WorldStoreState>((set, get) => ({
  timeSnapshot: INITIAL_TIME_SNAPSHOT,
  weatherSnapshot: INITIAL_WEATHER_SNAPSHOT,
  timeline: null,
  isInitialized: false,
  devWeatherPreview: null,

  init: (mode: TimeMode = 'realtime', demoPreset: DemoTimePreset | null = null) => {
    const state = get();
    if (state.isInitialized) return;

    // 初始化时间服务
    const timeService = getTimeService();
    timeService.init(mode, demoPreset);

    const snapshot = timeService.getSnapshot() ?? createSnapshot(mode, demoPreset);

    // 生成天气时间线
    const timeline = buildTimeline(snapshot.localDate);

    // 解析当前天气
    const weather = resolveCurrentWeather(timeline, snapshot.localMinutes);

    set({
      timeSnapshot: snapshot,
      timeline,
      weatherSnapshot: weather,
      isInitialized: true,
    });

    // 设置时间服务监听器
    const listener: TimeSnapshotListener = (newSnapshot) => {
      const current = get();
      const phaseChanged = hasPhaseOrDateChanged(current.timeSnapshot, newSnapshot);

      // 如果日期变化，重新生成时间线
      let newTimeline = current.timeline;
      let newWeather = current.weatherSnapshot;
      if (current.timeline && current.timeline.date !== newSnapshot.localDate) {
        newTimeline = buildTimeline(newSnapshot.localDate);
        newWeather = resolveCurrentWeather(newTimeline, newSnapshot.localMinutes);
      } else if (current.timeline) {
        // 日期没变，只解析当前天气
        const resolved = resolveCurrentWeather(current.timeline, newSnapshot.localMinutes);
        if (isWeatherChanged(current.weatherSnapshot, resolved)) {
          newWeather = resolved;
        }
      }

      set({
        timeSnapshot: newSnapshot,
        timeline: newTimeline,
        weatherSnapshot: newWeather,
      });

      void phaseChanged;
    };

    timeListener?.();
    timeListener = timeService.subscribe(listener);
  },

  setTimeMode: (mode: TimeMode, demoPreset: DemoTimePreset | null = null) => {
    const timeService = getTimeService();
    timeService.setMode(mode, demoPreset);

    const snapshot = timeService.getSnapshot();
    if (!snapshot) return;

    const state = get();
    // 演示模式只改变当前查询分钟，不重新生成天气时间线
    const timeline = state.timeline;
    let weather = state.weatherSnapshot;
    if (timeline) {
      const resolved = resolveCurrentWeather(timeline, snapshot.localMinutes);
      if (isWeatherChanged(state.weatherSnapshot, resolved)) {
        weather = resolved;
      }
    }

    set({ timeSnapshot: snapshot, weatherSnapshot: weather });
  },

  refreshTime: () => {
    const timeService = getTimeService();
    timeService.refresh();
    const snapshot = timeService.getSnapshot();
    if (!snapshot) return;

    const state = get();
    let timeline = state.timeline;
    let weather = state.weatherSnapshot;

    if (timeline && timeline.date !== snapshot.localDate) {
      timeline = buildTimeline(snapshot.localDate);
      weather = resolveCurrentWeather(timeline, snapshot.localMinutes);
    } else if (timeline) {
      const resolved = resolveCurrentWeather(timeline, snapshot.localMinutes);
      if (isWeatherChanged(state.weatherSnapshot, resolved)) {
        weather = resolved;
      }
    }

    set({ timeSnapshot: snapshot, timeline, weatherSnapshot: weather });
  },

  resetWorld: () => {
    timeListener?.();
    timeListener = null;
    destroyTimeService();
    set({
      timeSnapshot: INITIAL_TIME_SNAPSHOT,
      weatherSnapshot: INITIAL_WEATHER_SNAPSHOT,
      timeline: null,
      isInitialized: false,
      devWeatherPreview: null,
    });
  },

  setDevWeatherPreview: (weather: WeatherType | null) => {
    set({ devWeatherPreview: weather });
  },

  exitDevWeatherPreview: () => {
    set({ devWeatherPreview: null });
  },

  getCurrentWorldTime: () => get().timeSnapshot,
  getCurrentWeather: () => get().weatherSnapshot,
  getWeatherTimeline: () => get().timeline,
  getDisplayWeather: () => {
    const state = get();
    return state.devWeatherPreview ?? state.weatherSnapshot.weather;
  },
}));
