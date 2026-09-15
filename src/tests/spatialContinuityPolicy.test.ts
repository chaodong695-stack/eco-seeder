import { describe, expect, it } from 'vitest';
import { FAR_ATMOSPHERE, TRANSITION_BAND, FAR_VISUAL_POLICY, CONTINUITY_ANCHOR } from '@/game/visual/spatialContinuityPolicy';

describe('spatial continuity policy', () => {
  it('keeps the transition band within the required 12-20% viewport range', () => {
    expect(TRANSITION_BAND.heightRatio).toBeGreaterThanOrEqual(0.12);
    expect(TRANSITION_BAND.heightRatio).toBeLessThanOrEqual(0.2);
    expect(TRANSITION_BAND.topRatio).toBeGreaterThan(0.35);
    expect(TRANSITION_BAND.topRatio + TRANSITION_BAND.heightRatio).toBeLessThan(0.7);
  });

  it('subdues the far layer without making it invisible', () => {
    expect(FAR_VISUAL_POLICY.contrast).toBeGreaterThanOrEqual(0.75);
    expect(FAR_VISUAL_POLICY.contrast).toBeLessThanOrEqual(0.85);
    expect(FAR_VISUAL_POLICY.saturation).toBeGreaterThanOrEqual(0.7);
    expect(FAR_VISUAL_POLICY.saturation).toBeLessThanOrEqual(0.85);
    expect(FAR_VISUAL_POLICY.alpha).toBeGreaterThan(0.5);
  });

  it('defines a continuous anchor across far, transition and mid layers', () => {
    expect(CONTINUITY_ANCHOR.segmentCount).toBe(3);
    expect(CONTINUITY_ANCHOR.maxCornerAngle).toBeLessThan(20);
    expect(FAR_ATMOSPHERE.bottomAlpha).toBeGreaterThan(FAR_ATMOSPHERE.topAlpha);
  });
});
