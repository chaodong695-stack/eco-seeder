import { describe, it, expect } from 'vitest';
import {
  calculateProgress,
  clamp01,
  clamp100,
  progressToPercent,
  isProgressComplete,
  accumulateElapsed,
  progressBarText,
} from '@/game/restoration/restorationProgress';

describe('RestorationProgress', () => {
  describe('calculateProgress', () => {
    it('returns 0 at start', () => {
      expect(calculateProgress(0, 3000)).toBe(0);
    });

    it('returns 0.5 at half time', () => {
      expect(calculateProgress(1500, 3000)).toBeCloseTo(0.5, 5);
    });

    it('returns 1 at full time', () => {
      expect(calculateProgress(3000, 3000)).toBe(1);
    });

    it('clamps to 1 when exceeding duration', () => {
      expect(calculateProgress(4000, 3000)).toBe(1);
    });

    it('returns 0 for negative elapsed', () => {
      expect(calculateProgress(-100, 3000)).toBe(0);
    });

    it('returns 1 when duration is 0 or negative', () => {
      expect(calculateProgress(100, 0)).toBe(1);
      expect(calculateProgress(100, -1)).toBe(1);
    });
  });

  describe('clamp01', () => {
    it('clamps values to 0-1 range', () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(1)).toBe(1);
      expect(clamp01(1.5)).toBe(1);
    });
  });

  describe('clamp100', () => {
    it('clamps values to 0-100 range', () => {
      expect(clamp100(-10)).toBe(0);
      expect(clamp100(0)).toBe(0);
      expect(clamp100(50)).toBe(50);
      expect(clamp100(100)).toBe(100);
      expect(clamp100(150)).toBe(100);
    });
  });

  describe('progressToPercent', () => {
    it('converts progress to percentage', () => {
      expect(progressToPercent(0)).toBe(0);
      expect(progressToPercent(0.5)).toBe(50);
      expect(progressToPercent(1)).toBe(100);
    });

    it('clamps before converting', () => {
      expect(progressToPercent(-0.5)).toBe(0);
      expect(progressToPercent(1.5)).toBe(100);
    });
  });

  describe('isProgressComplete', () => {
    it('returns true when progress >= 1', () => {
      expect(isProgressComplete(1)).toBe(true);
      expect(isProgressComplete(1.5)).toBe(true);
    });

    it('returns false when progress < 1', () => {
      expect(isProgressComplete(0)).toBe(false);
      expect(isProgressComplete(0.99)).toBe(false);
    });
  });

  describe('accumulateElapsed', () => {
    it('accumulates delta time', () => {
      expect(accumulateElapsed(0, 1000, 3000)).toBe(1000);
      expect(accumulateElapsed(1000, 500, 3000)).toBe(1500);
    });

    it('does not exceed duration', () => {
      expect(accumulateElapsed(2500, 1000, 3000)).toBe(3000);
    });

    it('handles negative delta as zero', () => {
      expect(accumulateElapsed(1000, -100, 3000)).toBe(1000);
    });

    it('does not depend on keyboard repeat events', () => {
      // Simulating different frame intervals that total the same
      const result1 = accumulateElapsed(0, 16, 3000); // 16ms per frame
      const result2 = accumulateElapsed(0, 33, 3000); // 33ms per frame
      // Different deltas give different results — progress is based on time, not repeat count
      expect(result1).not.toBe(result2);

      // But accumulating the same total time gives the same result
      let elapsed1 = 0;
      for (let i = 0; i < 10; i++) {
        elapsed1 = accumulateElapsed(elapsed1, 100, 3000);
      }
      let elapsed2 = 0;
      for (let i = 0; i < 5; i++) {
        elapsed2 = accumulateElapsed(elapsed2, 200, 3000);
      }
      // Both total 1000ms
      expect(elapsed1).toBe(elapsed2);
    });

    it('different frame intervals give consistent final result', () => {
      // 3 seconds total, split into different frame sizes
      const duration = 3000;

      // Frame size 16ms (≈60fps)
      let elapsed1 = 0;
      while (elapsed1 < duration) {
        elapsed1 = accumulateElapsed(elapsed1, 16, duration);
      }

      // Frame size 50ms (≈20fps)
      let elapsed2 = 0;
      while (elapsed2 < duration) {
        elapsed2 = accumulateElapsed(elapsed2, 50, duration);
      }

      // Both should reach exactly duration
      expect(elapsed1).toBe(duration);
      expect(elapsed2).toBe(duration);
      // Both should be complete
      expect(isProgressComplete(calculateProgress(elapsed1, duration))).toBe(true);
      expect(isProgressComplete(calculateProgress(elapsed2, duration))).toBe(true);
    });
  });

  describe('progressBarText', () => {
    it('returns empty bar at 0 progress', () => {
      expect(progressBarText(0)).toBe('░░░░░░░░░░');
    });

    it('returns full bar at 1 progress', () => {
      expect(progressBarText(1)).toBe('██████████');
    });

    it('returns partial bar at 0.5 progress', () => {
      expect(progressBarText(0.5)).toBe('█████░░░░░');
    });

    it('respects custom characters and length', () => {
      expect(progressBarText(0.5, '#', '-', 4)).toBe('##--');
    });

    it('clamps before generating', () => {
      expect(progressBarText(-0.5)).toBe('░░░░░░░░░░');
      expect(progressBarText(1.5)).toBe('██████████');
    });
  });

  describe('progress preserves after interruption (simulation)', () => {
    it('progress is retained when accumulation stops and resumes', () => {
      const duration = 3000;
      let elapsed = 0;

      // Accumulate to 50%
      elapsed = accumulateElapsed(elapsed, 1500, duration);
      expect(calculateProgress(elapsed, duration)).toBeCloseTo(0.5, 5);

      // "Interruption" — no accumulation
      const savedElapsed = elapsed;

      // "Resume" — continue from saved progress
      elapsed = accumulateElapsed(savedElapsed, 500, duration);
      expect(calculateProgress(elapsed, duration)).toBeCloseTo(
        2000 / 3000,
        5,
      );

      // Complete
      elapsed = accumulateElapsed(elapsed, 1000, duration);
      expect(calculateProgress(elapsed, duration)).toBe(1);
      expect(isProgressComplete(calculateProgress(elapsed, duration))).toBe(true);
    });
  });
});
