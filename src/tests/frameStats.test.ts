import { describe, expect, it } from 'vitest';
import { summarizeFrames } from '@/game/visual/frameStats';

describe('frame statistics', () => {
  it('returns average, 1% low and minimum in ascending FPS order', () => {
    expect(summarizeFrames([
      { timestamp: 0, deltaMs: 16.67, fps: 60 },
      { timestamp: 1, deltaMs: 20, fps: 50 },
      { timestamp: 2, deltaMs: 33.33, fps: 30 },
      { timestamp: 3, deltaMs: 16.67, fps: Number.POSITIVE_INFINITY },
    ])).toEqual({ average: 140 / 3, low1: 30, min: 30 });
  });

  it('returns zeroes for an empty or invalid sample window', () => {
    expect(summarizeFrames([{ timestamp: 0, deltaMs: 0, fps: Number.NaN }])).toEqual({ average: 0, low1: 0, min: 0 });
  });
});
