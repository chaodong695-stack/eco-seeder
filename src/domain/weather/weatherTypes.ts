/**
 * 天气类型定义。
 *
 * 所有天气配置集中保存，不直接写死在 React 组件中。
 */

/** 天气类型。 */
export type WeatherType =
  | 'clear'
  | 'overcast'
  | 'light_rain'
  | 'heavy_rain'
  | 'fog';

/** 天气定义。 */
export interface WeatherDefinition {
  type: WeatherType;
  displayName: string;
  intensity: number;
  visibility: number;
  ambientTint: number;
  overlayAlpha: number;
  particleProfile: string | null;
}

/** 所有天气类型的定义配置。 */
export const WEATHER_DEFINITIONS: Record<WeatherType, WeatherDefinition> = {
  clear: {
    type: 'clear',
    displayName: '晴朗',
    intensity: 0.2,
    visibility: 1.0,
    ambientTint: 0xfffacd,
    overlayAlpha: 0,
    particleProfile: null,
  },
  overcast: {
    type: 'overcast',
    displayName: '阴天',
    intensity: 0.5,
    visibility: 0.8,
    ambientTint: 0x999999,
    overlayAlpha: 0.15,
    particleProfile: null,
  },
  light_rain: {
    type: 'light_rain',
    displayName: '小雨',
    intensity: 0.6,
    visibility: 0.7,
    ambientTint: 0x7799aa,
    overlayAlpha: 0.2,
    particleProfile: 'light_rain',
  },
  heavy_rain: {
    type: 'heavy_rain',
    displayName: '暴雨',
    intensity: 0.9,
    visibility: 0.45,
    ambientTint: 0x446677,
    overlayAlpha: 0.35,
    particleProfile: 'heavy_rain',
  },
  fog: {
    type: 'fog',
    displayName: '雾',
    intensity: 0.7,
    visibility: 0.35,
    ambientTint: 0xcccccc,
    overlayAlpha: 0.25,
    particleProfile: 'fog',
  },
};

/** 天气类型列表。 */
export const ALL_WEATHER_TYPES: WeatherType[] = [
  'clear',
  'overcast',
  'light_rain',
  'heavy_rain',
  'fog',
];

/**
 * 获取天气定义。
 */
export function getWeatherDefinition(type: WeatherType): WeatherDefinition {
  return WEATHER_DEFINITIONS[type];
}
