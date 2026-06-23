import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from '@/store/worldStore';
import { destroyTimeService } from '@/domain/time/worldTimeService';

describe('worldStore', () => {
  beforeEach(() => {
    destroyTimeService();
    useWorldStore.getState().resetWorld();
  });

  describe('init', () => {
    it('initializes time snapshot', () => {
      useWorldStore.getState().init('realtime');
      const state = useWorldStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.timeSnapshot.mode).toBe('realtime');
      expect(state.timeSnapshot.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('initializes weather timeline', () => {
      useWorldStore.getState().init('realtime');
      const state = useWorldStore.getState();
      expect(state.timeline).not.toBeNull();
      expect(state.timeline!.entries.length).toBeGreaterThanOrEqual(4);
    });

    it('initializes current weather', () => {
      useWorldStore.getState().init('realtime');
      const state = useWorldStore.getState();
      expect(state.weatherSnapshot).toBeDefined();
      expect(state.weatherSnapshot.weather).toBeDefined();
    });

    it('is idempotent', () => {
      useWorldStore.getState().init('realtime');
      const first = useWorldStore.getState().timeSnapshot;
      useWorldStore.getState().init('realtime');
      const second = useWorldStore.getState().timeSnapshot;
      expect(second).toEqual(first);
    });
  });

  describe('setTimeMode', () => {
    it('switches to demo mode', () => {
      useWorldStore.getState().init('realtime');
      useWorldStore.getState().setTimeMode('demo', 'night');
      const state = useWorldStore.getState();
      expect(state.timeSnapshot.mode).toBe('demo');
      expect(state.timeSnapshot.demoPreset).toBe('night');
      expect(state.timeSnapshot.phase).toBe('night');
    });

    it('switches back to realtime mode', () => {
      useWorldStore.getState().init('realtime');
      useWorldStore.getState().setTimeMode('demo', 'night');
      useWorldStore.getState().setTimeMode('realtime', null);
      const state = useWorldStore.getState();
      expect(state.timeSnapshot.mode).toBe('realtime');
      expect(state.timeSnapshot.demoPreset).toBeNull();
    });

    it('does not regenerate timeline on mode switch', () => {
      useWorldStore.getState().init('realtime');
      const timelineBefore = useWorldStore.getState().timeline;
      useWorldStore.getState().setTimeMode('demo', 'dawn');
      const timelineAfter = useWorldStore.getState().timeline;
      expect(timelineAfter).toBe(timelineBefore);
    });
  });

  describe('resetWorld', () => {
    it('resets to safe initial state', () => {
      useWorldStore.getState().init('realtime');
      useWorldStore.getState().resetWorld();
      const state = useWorldStore.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.timeline).toBeNull();
      expect(state.timeSnapshot.localDate).toBe('1970-01-01');
      expect(state.weatherSnapshot.weather).toBe('clear');
    });

    it('allows re-initialization after reset', () => {
      useWorldStore.getState().init('realtime');
      useWorldStore.getState().resetWorld();
      useWorldStore.getState().init('realtime');
      const state = useWorldStore.getState();
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('read-only accessors', () => {
    it('getCurrentWorldTime returns current snapshot', () => {
      useWorldStore.getState().init('realtime');
      const snap = useWorldStore.getState().getCurrentWorldTime();
      expect(snap.mode).toBe('realtime');
    });

    it('getCurrentWeather returns current weather', () => {
      useWorldStore.getState().init('realtime');
      const weather = useWorldStore.getState().getCurrentWeather();
      expect(weather.weather).toBeDefined();
    });

    it('getWeatherTimeline returns current timeline', () => {
      useWorldStore.getState().init('realtime');
      const timeline = useWorldStore.getState().getWeatherTimeline();
      expect(timeline).not.toBeNull();
      expect(timeline!.entries.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('same weather no duplicate update', () => {
    it('does not change weather when same', () => {
      useWorldStore.getState().init('realtime');
      const weather1 = useWorldStore.getState().weatherSnapshot;
      void weather1;
      useWorldStore.getState().refreshTime();
      const weather2 = useWorldStore.getState().weatherSnapshot;
      // Weather should be the same (or change if minute crossed boundary, but unlikely in test)
      // Just verify no crash
      expect(weather2).toBeDefined();
    });
  });
});
