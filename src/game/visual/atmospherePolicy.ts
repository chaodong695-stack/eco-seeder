import type { WeatherType } from '@/domain/weather/weatherTypes';
export type AtmosphereLayer = 'far' | 'mid' | 'gameplay' | 'foreground';
export const FOG_POLICY: Record<AtmosphereLayer, { alpha: number; color: number }> = { far: { alpha: 0.30, color: 0xb8c4c5 }, mid: { alpha: 0.18, color: 0xaebabc }, gameplay: { alpha: 0.06, color: 0x9eafb2 }, foreground: { alpha: 0.10, color: 0x87999d } };
export function fogAlpha(layer: AtmosphereLayer, weather: WeatherType): number { return weather === 'fog' ? FOG_POLICY[layer].alpha : 0; }
