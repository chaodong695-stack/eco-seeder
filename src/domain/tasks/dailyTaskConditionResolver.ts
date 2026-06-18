/**
 * 每日任务条件解析器 — 纯函数。
 *
 * 根据当前天气判断任务是否可执行。
 * 区分"当日是否可能出现该天气"与"当前天气是否满足执行条件"。
 */

import type { DailyTaskDefinition } from './dailyTaskTypes';
import type { DailyTaskStatus } from './dailyTaskTypes';
import type { WeatherType } from '@/domain/weather/weatherTypes';

/**
 * 判断当前天气是否满足任务的执行条件。
 *
 * 无天气限制的任务总是返回 true。
 */
export function isWeatherConditionMet(
  def: DailyTaskDefinition,
  currentWeather: WeatherType,
): boolean {
  const supported = def.condition?.supportedWeather;
  if (!supported || supported.length === 0) return true;
  return supported.includes(currentWeather);
}

/**
 * 判断当日天气时间线中是否可能出现该任务所需的天气。
 */
export function isWeatherConditionPossibleInTimeline(
  def: DailyTaskDefinition,
  timelineWeatherTypes: readonly WeatherType[],
): boolean {
  const supported = def.condition?.supportedWeather;
  if (!supported || supported.length === 0) return true;
  return supported.some((w) => timelineWeatherTypes.includes(w));
}

/**
 * 从天气时间线中提取所有出现过的天气类型。
 */
export function extractWeatherTypesFromTimeline(
  entries: ReadonlyArray<{ weather: WeatherType }>,
): WeatherType[] {
  const set = new Set<WeatherType>();
  for (const entry of entries) {
    set.add(entry.weather);
  }
  return Array.from(set);
}

/**
 * 根据当前天气和任务状态解析任务应处于的运行时状态。
 *
 * 纯函数：不修改任务实例，只返回建议状态。
 *
 * 规则：
 * - completed 任务保持 completed；
 * - available 任务保持 available（未接取）；
 * - active 任务在天气条件不满足时变为 waiting_condition；
 * - waiting_condition 任务在天气条件满足时变为 active；
 */
export function resolveTaskStatus(
  def: DailyTaskDefinition,
  currentStatus: DailyTaskStatus,
  currentWeather: WeatherType,
): DailyTaskStatus {
  if (currentStatus === 'completed') return 'completed';
  if (currentStatus === 'available') return 'available';

  // active 或 waiting_condition
  const conditionMet = isWeatherConditionMet(def, currentWeather);
  if (conditionMet) {
    return 'active';
  }
  return 'waiting_condition';
}

/**
 * 获取任务等待天气的中文显示文本。
 */
export function getWaitingWeatherText(def: DailyTaskDefinition): string {
  const supported = def.condition?.supportedWeather;
  if (!supported || supported.length === 0) return '';
  return supported.join('、');
}
