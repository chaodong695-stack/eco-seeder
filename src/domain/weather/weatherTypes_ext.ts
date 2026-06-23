/**
 * 天气快照类型 — 供 UI 和 DEV-06 使用。
 */

import type { WeatherType } from './weatherTypes';

/** 当前天气快照。 */
export interface WeatherSnapshot {
  date: string;
  mapId: string;
  weather: WeatherType;
  displayName: string;
  intensity: number;
  visibility: number;
  timelineEntryId: string;
}
