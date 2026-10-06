import { describe, expect, it } from 'vitest';
import { foregroundPolicy, isInsidePrimaryRoute, STAGE_ONE_VISUALS } from '@/game/visual/stageOneVisualPolicy';

describe('stage one visual policy', () => {
  it('keeps foreground lighter and far layer softer than gameplay', () => {
    expect(STAGE_ONE_VISUALS.foregroundAlpha).toBeLessThan(0.6);
    expect(STAGE_ONE_VISUALS.farAlpha).toBeLessThan(STAGE_ONE_VISUALS.midAlpha);
  });
  it('defines a continuous primary route', () => {
    expect(isInsidePrimaryRoute(960, 730)).toBe(true);
    expect(isInsidePrimaryRoute(960, 1010)).toBe(true);
    expect(isInsidePrimaryRoute(700, 860)).toBe(false);
  });
  it('scales foreground safe margins with viewport', () => {
    expect(foregroundPolicy(1280).rightSafeX).toBeGreaterThan(foregroundPolicy(800).rightSafeX);
  });
});
