import { describe, expect, it } from 'vitest';
import { RAIN_LAYERS, PARTICLE_BUDGET, scaleForBudget, totalRainBudget } from '@/game/weather/rainConfig';
import { fogAlpha } from '@/game/visual/atmospherePolicy';
import { summarizeFrames } from '@/game/visual/frameStats';
import { ASSET_GROUPS, shouldLoad } from '@/game/assets/assetLoadPolicy';

describe('stage four policies', () => {
  it('keeps rain layer budgets within quality budgets', () => {
    expect(Object.keys(RAIN_LAYERS)).toEqual(['back', 'mid', 'front']);
    expect(totalRainBudget('medium')).toBeLessThanOrEqual(PARTICLE_BUDGET.medium);
    expect(totalRainBudget('low')).toBeLessThanOrEqual(PARTICLE_BUDGET.low);
    expect(scaleForBudget('high')).toBeGreaterThan(scaleForBudget('medium'));
  });
  it('keeps gameplay fog lighter than far fog', () => {
    expect(fogAlpha('gameplay', 'fog')).toBeLessThan(fogAlpha('far', 'fog'));
    expect(fogAlpha('far', 'clear')).toBe(0);
    expect(fogAlpha('far', 'light_rain')).toBe(0);
  });
  it('summarizes finite fps and ignores invalid samples', () => {
    expect(summarizeFrames([{ timestamp: 0, deltaMs: 16, fps: 60 }, { timestamp: 1, deltaMs: 16, fps: Number.NaN }, { timestamp: 2, deltaMs: 20, fps: 30 }])).toEqual({ average: 45, low1: 30, min: 30 });
  });
  it('loads critical and route assets on narrow viewports only', () => {
    expect(ASSET_GROUPS.critical.length).toBeGreaterThan(0);
    expect(shouldLoad('critical', 600)).toBe(true);
    expect(shouldLoad('route', 600)).toBe(true);
    expect(shouldLoad('optional', 600)).toBe(false);
    expect(shouldLoad('optional', 1200)).toBe(true);
  });
});
