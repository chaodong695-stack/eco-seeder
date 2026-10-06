export type RainLayer = 'back' | 'mid' | 'front';
export interface RainLayerConfig { maxAlive: number; frequency: number; lifespan: number; speedY: [number, number]; speedX: [number, number]; size: number; alpha: [number, number]; depth: number; scrollFactor: number; }
export const RAIN_LAYERS: Record<RainLayer, RainLayerConfig> = {
  back: { maxAlive: 35, frequency: 90, lifespan: 900, speedY: [420, 560], speedX: [-35, -15], size: 0.65, alpha: [0.18, 0.08], depth: 3050, scrollFactor: 0.72 },
  mid: { maxAlive: 85, frequency: 45, lifespan: 700, speedY: [620, 780], speedX: [-60, -30], size: 0.9, alpha: [0.38, 0.16], depth: 3060, scrollFactor: 0.88 },
  front: { maxAlive: 40, frequency: 75, lifespan: 520, speedY: [820, 980], speedX: [-90, -45], size: 1.2, alpha: [0.55, 0.20], depth: 3070, scrollFactor: 1 },
};
export type EffectsQuality = 'low' | 'medium' | 'high';
export const PARTICLE_BUDGET: Record<EffectsQuality, number> = { low: 80, medium: 160, high: 260 };
export function scaleForBudget(quality: EffectsQuality): number { return quality === 'low' ? 0.5 : quality === 'high' ? 1.5 : 1; }
export function totalRainBudget(quality: EffectsQuality): number {
  return Math.min(PARTICLE_BUDGET[quality], Math.floor(Object.values(RAIN_LAYERS).reduce((sum, layer) => sum + layer.maxAlive, 0) * scaleForBudget(quality)));
}
export function layerBudget(layer: RainLayer, quality: EffectsQuality): number {
  const scaled = Math.floor(RAIN_LAYERS[layer].maxAlive * scaleForBudget(quality));
  return Math.min(scaled, Math.max(0, PARTICLE_BUDGET[quality] - (Object.keys(RAIN_LAYERS) as RainLayer[]).filter((item) => item !== layer).reduce((sum, item) => sum + Math.floor(RAIN_LAYERS[item].maxAlive * scaleForBudget(quality)), 0)));
}
