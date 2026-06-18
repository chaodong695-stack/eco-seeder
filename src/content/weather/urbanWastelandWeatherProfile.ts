/**
 * 地图天气配置。
 *
 * 为 urban_wasteland 建立独立天气配置。
 * 权重通过配置定义，不在 Scene 中手写随机概率。
 */

import { z } from 'zod';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import { ALL_WEATHER_TYPES } from '@/domain/weather/weatherTypes';

/** 天气类型 Zod schema。 */
export const WeatherTypeSchema = z.enum([
  'clear',
  'overcast',
  'light_rain',
  'heavy_rain',
  'fog',
]);

/** 地图天气配置。 */
export interface WeatherProfile {
  id: string;
  mapId: string;
  supportedWeather: WeatherType[];
  baseWeights: Record<WeatherType, number>;
  transitionWeights: Partial<
    Record<WeatherType, Partial<Record<WeatherType, number>>>
  >;
}

/** 天气配置 Zod schema。 */
export const WeatherProfileSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  supportedWeather: z.array(WeatherTypeSchema).min(1),
  baseWeights: z.record(WeatherTypeSchema, z.number().nonnegative()),
  transitionWeights: z
    .record(WeatherTypeSchema, z.record(WeatherTypeSchema, z.number().nonnegative()))
    .optional(),
});

/**
 * urban_wasteland 天气配置。
 *
 * 雾港旧工业区 — 多雾多雨的工业湿地气候。
 */
export const URBAN_WASTELAND_WEATHER_PROFILE: WeatherProfile = {
  id: 'weather_profile.urban_wasteland',
  mapId: 'map.urban_wasteland',
  supportedWeather: ALL_WEATHER_TYPES,
  baseWeights: {
    clear: 25,
    overcast: 30,
    light_rain: 20,
    heavy_rain: 10,
    fog: 15,
  },
  transitionWeights: {
    clear: { clear: 40, overcast: 30, light_rain: 10, fog: 20, heavy_rain: 0 },
    overcast: { clear: 15, overcast: 35, light_rain: 30, fog: 15, heavy_rain: 5 },
    light_rain: { clear: 10, overcast: 25, light_rain: 30, fog: 20, heavy_rain: 15 },
    heavy_rain: { clear: 5, overcast: 20, light_rain: 40, fog: 10, heavy_rain: 25 },
    fog: { clear: 15, overcast: 25, light_rain: 20, fog: 30, heavy_rain: 10 },
  },
};

/**
 * 校验天气配置。
 *
 * 权重总和必须 > 0，且只包含支持的天气类型。
 */
export function validateWeatherProfile(profile: WeatherProfile): void {
  const result = WeatherProfileSchema.safeParse(profile);
  if (!result.success) {
    throw new Error(
      `天气配置校验失败: ${result.error.message}`,
    );
  }

  // 校验 baseWeights 包含所有支持的天气
  for (const weather of profile.supportedWeather) {
    if (!(weather in profile.baseWeights)) {
      throw new Error(
        `天气配置错误: baseWeights 缺少支持的天气类型 "${weather}"`,
      );
    }
  }

  // 校验 baseWeights 总和 > 0
  const totalWeight = Object.values(profile.baseWeights).reduce(
    (sum, w) => sum + w,
    0,
  );
  if (totalWeight <= 0) {
    throw new Error(
      `天气配置错误: baseWeights 权重总和必须大于 0，当前为 ${totalWeight}`,
    );
  }

  // 校验 baseWeights 不包含未支持的天气
  for (const key of Object.keys(profile.baseWeights) as WeatherType[]) {
    if (!profile.supportedWeather.includes(key)) {
      throw new Error(
        `天气配置错误: baseWeights 包含未支持的天气类型 "${key}"`,
      );
    }
  }
}

/**
 * 获取地图天气配置。
 */
export function getWeatherProfile(mapId: string): WeatherProfile {
  if (mapId === URBAN_WASTELAND_WEATHER_PROFILE.mapId) {
    validateWeatherProfile(URBAN_WASTELAND_WEATHER_PROFILE);
    return URBAN_WASTELAND_WEATHER_PROFILE;
  }
  throw new Error(`未找到地图 "${mapId}" 的天气配置`);
}
