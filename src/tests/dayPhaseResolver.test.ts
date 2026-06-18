import { describe, it, expect } from 'vitest';
import { resolveDayPhase, normalizeMinutes, isValidMinutes, MINUTES_PER_DAY } from '@/domain/time/dayPhaseResolver';
import { DEFAULT_DAY_PHASE_BOUNDARIES } from '@/domain/time/timeTypes';

describe('dayPhaseResolver', () => {
  describe('resolveDayPhase', () => {
    it('00:00 (minute 0) is night', () => {
      expect(resolveDayPhase(0)).toBe('night');
    });

    it('dawn start boundary (05:00 = 300) is dawn', () => {
      expect(resolveDayPhase(300)).toBe('dawn');
    });

    it('day start boundary (08:00 = 480) is day', () => {
      expect(resolveDayPhase(480)).toBe('day');
    });

    it('dusk start boundary (17:00 = 1020) is dusk', () => {
      expect(resolveDayPhase(1020)).toBe('dusk');
    });

    it('night start boundary (20:00 = 1200) is night', () => {
      expect(resolveDayPhase(1200)).toBe('night');
    });

    it('23:59 (minute 1439) is night', () => {
      expect(resolveDayPhase(1439)).toBe('night');
    });

    it('04:59 (minute 299) is night (before dawn)', () => {
      expect(resolveDayPhase(299)).toBe('night');
    });

    it('07:59 (minute 479) is dawn (before day)', () => {
      expect(resolveDayPhase(479)).toBe('dawn');
    });

    it('16:59 (minute 1019) is day (before dusk)', () => {
      expect(resolveDayPhase(1019)).toBe('day');
    });

    it('19:59 (minute 1199) is dusk (before night)', () => {
      expect(resolveDayPhase(1199)).toBe('dusk');
    });
  });

  describe('normalizeMinutes', () => {
    it('normalizes negative values', () => {
      expect(normalizeMinutes(-1)).toBe(MINUTES_PER_DAY - 1);
    });

    it('normalizes values > 1439', () => {
      expect(normalizeMinutes(MINUTES_PER_DAY)).toBe(0);
      expect(normalizeMinutes(MINUTES_PER_DAY + 60)).toBe(60);
    });

    it('handles non-finite values', () => {
      expect(normalizeMinutes(NaN)).toBe(0);
      expect(normalizeMinutes(Infinity)).toBe(0);
    });

    it('floors decimal values', () => {
      expect(normalizeMinutes(300.7)).toBe(300);
    });
  });

  describe('isValidMinutes', () => {
    it('accepts valid range 0–1439', () => {
      expect(isValidMinutes(0)).toBe(true);
      expect(isValidMinutes(1439)).toBe(true);
      expect(isValidMinutes(720)).toBe(true);
    });

    it('rejects negative values', () => {
      expect(isValidMinutes(-1)).toBe(false);
    });

    it('rejects values > 1439', () => {
      expect(isValidMinutes(1440)).toBe(false);
    });

    it('rejects NaN', () => {
      expect(isValidMinutes(NaN)).toBe(false);
    });
  });

  describe('custom boundaries', () => {
    it('uses custom boundaries when provided', () => {
      const custom = {
        dawnStart: 6 * 60,
        dayStart: 9 * 60,
        duskStart: 18 * 60,
        nightStart: 21 * 60,
      };
      expect(resolveDayPhase(6 * 60, custom)).toBe('dawn');
      expect(resolveDayPhase(9 * 60, custom)).toBe('day');
      expect(resolveDayPhase(18 * 60, custom)).toBe('dusk');
      expect(resolveDayPhase(21 * 60, custom)).toBe('night');
    });
  });

  describe('DEFAULT_DAY_PHASE_BOUNDARIES', () => {
    it('has correct boundary values', () => {
      expect(DEFAULT_DAY_PHASE_BOUNDARIES.dawnStart).toBe(300);
      expect(DEFAULT_DAY_PHASE_BOUNDARIES.dayStart).toBe(480);
      expect(DEFAULT_DAY_PHASE_BOUNDARIES.duskStart).toBe(1020);
      expect(DEFAULT_DAY_PHASE_BOUNDARIES.nightStart).toBe(1200);
    });
  });
});
