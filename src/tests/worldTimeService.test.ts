import { describe, it, expect } from 'vitest';
import {
  createRealtimeSnapshot,
  createDemoSnapshot,
  createSnapshot,
  getLocalDateString,
  getLocalMinutes,
  hasPhaseOrDateChanged,
  hasMinutesChanged,
  WorldTimeService,
  getTimeService,
  destroyTimeService,
} from '@/domain/time/worldTimeService';

describe('worldTimeService', () => {
  describe('getLocalDateString', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15, 10, 30);
      expect(getLocalDateString(date)).toBe('2024-01-15');
    });

    it('pads month and day', () => {
      const date = new Date(2024, 2, 5, 10, 30);
      expect(getLocalDateString(date)).toBe('2024-03-05');
    });
  });

  describe('getLocalMinutes', () => {
    it('returns correct minutes from hours and minutes', () => {
      const date = new Date(2024, 0, 1, 10, 30);
      expect(getLocalMinutes(date)).toBe(630);
    });

    it('returns 0 for midnight', () => {
      const date = new Date(2024, 0, 1, 0, 0);
      expect(getLocalMinutes(date)).toBe(0);
    });

    it('returns 1439 for 23:59', () => {
      const date = new Date(2024, 0, 1, 23, 59);
      expect(getLocalMinutes(date)).toBe(1439);
    });
  });

  describe('createRealtimeSnapshot', () => {
    it('creates a snapshot with realtime mode', () => {
      const date = new Date(2024, 5, 15, 12, 0);
      const snapshot = createRealtimeSnapshot(date);
      expect(snapshot.mode).toBe('realtime');
      expect(snapshot.localDate).toBe('2024-06-15');
      expect(snapshot.localMinutes).toBe(720);
      expect(snapshot.phase).toBe('day');
      expect(snapshot.demoPreset).toBeNull();
    });
  });

  describe('createDemoSnapshot', () => {
    it('creates a snapshot with demo mode', () => {
      const date = new Date(2024, 5, 15, 12, 0);
      const snapshot = createDemoSnapshot('night', date);
      expect(snapshot.mode).toBe('demo');
      expect(snapshot.localDate).toBe('2024-06-15');
      expect(snapshot.localMinutes).toBe(22 * 60);
      expect(snapshot.phase).toBe('night');
      expect(snapshot.demoPreset).toBe('night');
    });

    it('uses preset minutes, not actual time', () => {
      const date = new Date(2024, 5, 15, 12, 0); // actual noon
      const snapshot = createDemoSnapshot('dawn', date);
      expect(snapshot.localMinutes).toBe(6 * 60); // dawn minutes, not noon
      expect(snapshot.phase).toBe('dawn');
    });
  });

  describe('createSnapshot', () => {
    it('returns realtime snapshot for realtime mode', () => {
      const date = new Date(2024, 5, 15, 12, 0);
      const snapshot = createSnapshot('realtime', null, date);
      expect(snapshot.mode).toBe('realtime');
    });

    it('returns demo snapshot for demo mode with preset', () => {
      const date = new Date(2024, 5, 15, 12, 0);
      const snapshot = createSnapshot('demo', 'dusk', date);
      expect(snapshot.mode).toBe('demo');
      expect(snapshot.demoPreset).toBe('dusk');
    });
  });

  describe('hasPhaseOrDateChanged', () => {
    it('returns true when prev is null', () => {
      expect(hasPhaseOrDateChanged(null, createRealtimeSnapshot())).toBe(true);
    });

    it('returns false when phase and date are same', () => {
      const date = new Date(2024, 5, 15, 12, 0);
      const snap = createRealtimeSnapshot(date);
      expect(hasPhaseOrDateChanged(snap, snap)).toBe(false);
    });

    it('returns true when phase changes', () => {
      const date1 = new Date(2024, 5, 15, 12, 0);
      const date2 = new Date(2024, 5, 15, 22, 0);
      const snap1 = createRealtimeSnapshot(date1);
      const snap2 = createRealtimeSnapshot(date2);
      expect(hasPhaseOrDateChanged(snap1, snap2)).toBe(true);
    });

    it('returns true when date changes', () => {
      const date1 = new Date(2024, 5, 15, 12, 0);
      const date2 = new Date(2024, 5, 16, 12, 0);
      const snap1 = createRealtimeSnapshot(date1);
      const snap2 = createRealtimeSnapshot(date2);
      expect(hasPhaseOrDateChanged(snap1, snap2)).toBe(true);
    });
  });

  describe('hasMinutesChanged', () => {
    it('returns true when prev is null', () => {
      expect(hasMinutesChanged(null, createRealtimeSnapshot())).toBe(true);
    });

    it('returns false when minutes are same', () => {
      const snap = createRealtimeSnapshot(new Date(2024, 5, 15, 12, 0));
      expect(hasMinutesChanged(snap, snap)).toBe(false);
    });

    it('returns true when minutes differ', () => {
      const snap1 = createRealtimeSnapshot(new Date(2024, 5, 15, 12, 0));
      const snap2 = createRealtimeSnapshot(new Date(2024, 5, 15, 13, 0));
      expect(hasMinutesChanged(snap1, snap2)).toBe(true);
    });
  });

  describe('WorldTimeService', () => {
    it('initializes and provides snapshot', () => {
      const service = new WorldTimeService();
      service.init('realtime');
      const snapshot = service.getSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.mode).toBe('realtime');
      service.destroy();
    });

    it('is idempotent on init', () => {
      const service = new WorldTimeService();
      service.init('realtime');
      service.init('realtime');
      expect(service.isRunning()).toBe(true);
      service.destroy();
    });

    it('notifies listeners on setMode', () => {
      const service = new WorldTimeService();
      service.init('realtime');
      let received = false;
      const unsub = service.subscribe(() => { received = true; });
      service.setMode('demo', 'night');
      expect(received).toBe(true);
      unsub();
      service.destroy();
    });

    it('stops timer on destroy', () => {
      const service = new WorldTimeService();
      service.init('realtime');
      expect(service.isRunning()).toBe(true);
      service.destroy();
      expect(service.isRunning()).toBe(false);
    });

    it('does not emit same minute twice in realtime mode', () => {
      const service = new WorldTimeService();
      service.init('realtime');
      let count = 0;
      const unsub = service.subscribe(() => { count++; });
      // Refresh with same time
      const now = new Date();
      service.refresh(now);
      service.refresh(now);
      // First refresh might or might not increment depending on init timing,
      // but second refresh with same minute should not
      const afterFirst = count;
      service.refresh(now);
      expect(count).toBe(afterFirst);
      unsub();
      service.destroy();
    });
  });

  describe('global time service singleton', () => {
    it('returns same instance', () => {
      const s1 = getTimeService();
      const s2 = getTimeService();
      expect(s1).toBe(s2);
      destroyTimeService();
    });

    it('destroyTimeService cleans up', () => {
      const s1 = getTimeService();
      destroyTimeService();
      const s2 = getTimeService();
      expect(s1).not.toBe(s2);
      destroyTimeService();
    });
  });
});
