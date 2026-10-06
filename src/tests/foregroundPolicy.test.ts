import { describe, expect, it } from 'vitest';
import { foregroundCoverage, FOREGROUND_MAX_CENTER_COVERAGE, foregroundGradientAt } from '@/game/visual/foregroundPolicy';

describe('foreground policy', () => {
  it('measures screen-space coverage only', () => {
    expect(foregroundCoverage(842.4, 1080)).toBeCloseTo(0.22);
    expect(foregroundCoverage(1200, 1080)).toBe(0);
    expect(FOREGROUND_MAX_CENTER_COVERAGE).toBe(0.22);
  });
  it('handles invalid viewport sizes safely', () => expect(foregroundCoverage(100, 0)).toBe(0));
  it('makes the edges stronger than the center', () => {
    expect(foregroundGradientAt(0, 1280)).toBeGreaterThan(foregroundGradientAt(640, 1280));
    expect(foregroundGradientAt(640, 1280)).toBeLessThanOrEqual(FOREGROUND_MAX_CENTER_COVERAGE);
  });
});
