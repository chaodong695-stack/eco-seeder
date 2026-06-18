/**
 * 当前天气解析器 — 纯函数。
 *
 * 根据当前时间分钟数，从天气时间线解析当前天气。
 */

import type { WeatherTimeline, WeatherTimelineEntry } from './weatherTimelineGenerator';
import type { WeatherType } from './weatherTypes';
import { getWeatherDefinition } from './weatherTypes';
import type { WeatherSnapshot } from './weatherTypes_ext';

/**
 * 从时间线解析指定分钟数对应的天气条目。
 *
 * 当前时间位于某个区间时返回唯一天气。
 * 正确处理 00:00、区间边界和 23:59。
 */
export function resolveTimelineEntry(
  timeline: WeatherTimeline,
  minutes: number,
): WeatherTimelineEntry | null {
  for (const entry of timeline.entries) {
    if (minutes >= entry.startMinute && minutes <= entry.endMinute) {
      return entry;
    }
  }
  return null;
}

/**
 * 解析当前天气快照。
 *
 * 无匹配项时返回安全默认值（clear 天气）。
 */
export function resolveCurrentWeather(
  timeline: WeatherTimeline,
  minutes: number,
): WeatherSnapshot {
  const entry = resolveTimelineEntry(timeline, minutes);

  if (!entry) {
    // 安全默认值
    const def = getWeatherDefinition('clear');
    return {
      date: timeline.date,
      mapId: timeline.mapId,
      weather: 'clear' as WeatherType,
      displayName: def.displayName,
      intensity: def.intensity,
      visibility: def.visibility,
      timelineEntryId: 'fallback',
    };
  }

  const def = getWeatherDefinition(entry.weather);
  return {
    date: timeline.date,
    mapId: timeline.mapId,
    weather: entry.weather,
    displayName: def.displayName,
    intensity: entry.intensity,
    visibility: def.visibility,
    timelineEntryId: entry.id,
  };
}

/**
 * 判断天气是否发生变化。
 */
export function isWeatherChanged(
  prev: WeatherSnapshot | null,
  current: WeatherSnapshot,
): boolean {
  if (!prev) return true;
  return prev.weather !== current.weather || prev.timelineEntryId !== current.timelineEntryId;
}
