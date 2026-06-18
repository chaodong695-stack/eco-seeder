import { describe, it, expect, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useWorldStore } from '@/store/worldStore';
import { destroyTimeService } from '@/domain/time/worldTimeService';
import type { WorldTimeSnapshot } from '@/domain/time/timeTypes';
import type { WeatherSnapshot } from '@/domain/weather/weatherTypes_ext';
import type { WeatherTimeline } from '@/domain/weather/weatherTimelineGenerator';

describe('DEV-05 GameBridge events', () => {
  beforeEach(() => {
    gameBridge.clear();
    destroyTimeService();
    useWorldStore.getState().resetWorld();
  });

  describe('WORLD_TIME_CHANGED', () => {
    it('emits with correct payload', () => {
      let received: { previous: WorldTimeSnapshot | null; current: WorldTimeSnapshot } | null = null;
      const unsub = gameBridge.on('WORLD_TIME_CHANGED', (payload) => {
        received = payload;
      });

      const payload = {
        previous: null,
        current: {
          mode: 'realtime' as const,
          localDate: '2024-06-15',
          localMinutes: 720,
          timezoneOffsetMinutes: 480,
          phase: 'day' as const,
          demoPreset: null,
        },
      };
      gameBridge.emit('WORLD_TIME_CHANGED', payload);
      expect(received).toEqual(payload);
      unsub();
    });

    it('unsubscribe stops receiving', () => {
      let count = 0;
      const unsub = gameBridge.on('WORLD_TIME_CHANGED', () => { count++; });
      gameBridge.emit('WORLD_TIME_CHANGED', {
        previous: null,
        current: {} as WorldTimeSnapshot,
      });
      expect(count).toBe(1);
      unsub();
      gameBridge.emit('WORLD_TIME_CHANGED', {
        previous: null,
        current: {} as WorldTimeSnapshot,
      });
      expect(count).toBe(1);
    });
  });

  describe('DAY_PHASE_CHANGED', () => {
    it('emits with correct payload', () => {
      let received: { previousPhase: string | null; currentPhase: string; mode: string; localMinutes: number } | null = null;
      const unsub = gameBridge.on('DAY_PHASE_CHANGED', (payload) => {
        received = payload;
      });

      const payload = {
        previousPhase: null,
        currentPhase: 'day' as const,
        mode: 'realtime' as const,
        localMinutes: 720,
      };
      gameBridge.emit('DAY_PHASE_CHANGED', payload);
      expect(received).toEqual(payload);
      unsub();
    });

    it('unsubscribe stops receiving', () => {
      let count = 0;
      const unsub = gameBridge.on('DAY_PHASE_CHANGED', () => { count++; });
      gameBridge.emit('DAY_PHASE_CHANGED', {
        previousPhase: null,
        currentPhase: 'day',
        mode: 'realtime',
        localMinutes: 720,
      });
      expect(count).toBe(1);
      unsub();
      gameBridge.emit('DAY_PHASE_CHANGED', {
        previousPhase: null,
        currentPhase: 'day',
        mode: 'realtime',
        localMinutes: 720,
      });
      expect(count).toBe(1);
    });
  });

  describe('WEATHER_TIMELINE_GENERATED', () => {
    it('emits with correct payload', () => {
      let received: { timeline: WeatherTimeline } | null = null;
      const unsub = gameBridge.on('WEATHER_TIMELINE_GENERATED', (payload) => {
        received = payload;
      });

      const fakeTimeline: WeatherTimeline = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [],
      };
      gameBridge.emit('WEATHER_TIMELINE_GENERATED', { timeline: fakeTimeline });
      expect(received).toEqual({ timeline: fakeTimeline });
      unsub();
    });
  });

  describe('WEATHER_CHANGED_V2', () => {
    it('emits with correct payload', () => {
      let received: { previousWeather: string | null; current: WeatherSnapshot } | null = null;
      const unsub = gameBridge.on('WEATHER_CHANGED_V2', (payload) => {
        received = payload;
      });

      const fakeSnapshot: WeatherSnapshot = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear',
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'test',
      };
      gameBridge.emit('WEATHER_CHANGED_V2', { previousWeather: null, current: fakeSnapshot });
      expect(received).toEqual({ previousWeather: null, current: fakeSnapshot });
      unsub();
    });

    it('unsubscribe stops receiving', () => {
      let count = 0;
      const unsub = gameBridge.on('WEATHER_CHANGED_V2', () => { count++; });
      gameBridge.emit('WEATHER_CHANGED_V2', {
        previousWeather: null,
        current: {} as WeatherSnapshot,
      });
      expect(count).toBe(1);
      unsub();
      gameBridge.emit('WEATHER_CHANGED_V2', {
        previousWeather: null,
        current: {} as WeatherSnapshot,
      });
      expect(count).toBe(1);
    });
  });

  describe('clear removes all handlers', () => {
    it('no handlers receive events after clear', () => {
      let count = 0;
      gameBridge.on('WEATHER_CHANGED_V2', () => { count++; });
      gameBridge.clear();
      gameBridge.emit('WEATHER_CHANGED_V2', {
        previousWeather: null,
        current: {} as WeatherSnapshot,
      });
      expect(count).toBe(0);
    });
  });

  describe('DEV_WEATHER_PREVIEW', () => {
    it('emits with correct payload for preview weather', () => {
      let received: { weather: string | null } | null = null;
      const unsub = gameBridge.on('DEV_WEATHER_PREVIEW', (payload) => {
        received = payload;
      });

      gameBridge.emit('DEV_WEATHER_PREVIEW', { weather: 'fog' });
      expect(received).toEqual({ weather: 'fog' });
      unsub();
    });

    it('emits with null when exiting preview', () => {
      let received: { weather: string | null } | null = null;
      const unsub = gameBridge.on('DEV_WEATHER_PREVIEW', (payload) => {
        received = payload;
      });

      gameBridge.emit('DEV_WEATHER_PREVIEW', { weather: null });
      expect(received).toEqual({ weather: null });
      unsub();
    });

    it('unsubscribe stops receiving', () => {
      let count = 0;
      const unsub = gameBridge.on('DEV_WEATHER_PREVIEW', () => { count++; });
      gameBridge.emit('DEV_WEATHER_PREVIEW', { weather: 'clear' });
      expect(count).toBe(1);
      unsub();
      gameBridge.emit('DEV_WEATHER_PREVIEW', { weather: 'clear' });
      expect(count).toBe(1);
    });
  });
});
