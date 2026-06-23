import { describe, it, expect } from 'vitest';
import { resolveTimelineEntry, resolveCurrentWeather, isWeatherChanged } from '@/domain/weather/currentWeatherResolver';
import {
  generateWeatherTimeline,
  type WeatherTimeline,
} from '@/domain/weather/weatherTimelineGenerator';
import {
  URBAN_WASTELAND_WEATHER_PROFILE,
} from '@/content/weather/urbanWastelandWeatherProfile';
import type { WeatherSnapshot } from '@/domain/weather/weatherTypes_ext';
import type { WeatherType } from '@/domain/weather/weatherTypes';

const input = {
  anonymousPlayerId: 'anon.player.local.v1',
  localDate: '2024-06-15',
  mapId: 'map.urban_wasteland',
  versionId: 'eco-seeder.v0.1',
};

const timeline: WeatherTimeline = generateWeatherTimeline(input, URBAN_WASTELAND_WEATHER_PROFILE);

describe('currentWeatherResolver', () => {
  describe('resolveTimelineEntry', () => {
    it('resolves entry for minute 0', () => {
      const entry = resolveTimelineEntry(timeline, 0);
      expect(entry).not.toBeNull();
      expect(entry!.startMinute).toBe(0);
    });

    it('resolves entry for minute 1439', () => {
      const entry = resolveTimelineEntry(timeline, 1439);
      expect(entry).not.toBeNull();
      expect(entry!.endMinute).toBe(1439);
    });

    it('resolves entry at segment boundary start', () => {
      const entry = resolveTimelineEntry(timeline, timeline.entries[0].startMinute);
      expect(entry).not.toBeNull();
      expect(entry!.id).toBe(timeline.entries[0].id);
    });

    it('resolves entry at segment boundary end', () => {
      const entry = resolveTimelineEntry(timeline, timeline.entries[0].endMinute);
      expect(entry).not.toBeNull();
      expect(entry!.id).toBe(timeline.entries[0].id);
    });

    it('returns null for out of range minute (should not happen with 0-1439)', () => {
      const entry = resolveTimelineEntry(timeline, 1440);
      expect(entry).toBeNull();
    });
  });

  describe('resolveCurrentWeather', () => {
    it('returns weather snapshot with correct fields', () => {
      const snapshot = resolveCurrentWeather(timeline, 0);
      expect(snapshot.date).toBe('2024-06-15');
      expect(snapshot.mapId).toBe('map.urban_wasteland');
      expect(snapshot.weather).toBeDefined();
      expect(snapshot.displayName).toBeDefined();
      expect(snapshot.intensity).toBeGreaterThanOrEqual(0);
      expect(snapshot.visibility).toBeGreaterThan(0);
      expect(snapshot.timelineEntryId).toBeDefined();
    });

    it('returns safe default for out of range', () => {
      const snapshot = resolveCurrentWeather(timeline, 2000);
      expect(snapshot.weather).toBe('clear');
      expect(snapshot.timelineEntryId).toBe('fallback');
    });
  });

  describe('isWeatherChanged', () => {
    it('returns true when prev is null', () => {
      const current: WeatherSnapshot = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear' as WeatherType,
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'entry1',
      };
      expect(isWeatherChanged(null, current)).toBe(true);
    });

    it('returns false when same weather and entry', () => {
      const snap: WeatherSnapshot = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear' as WeatherType,
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'entry1',
      };
      expect(isWeatherChanged(snap, snap)).toBe(false);
    });

    it('returns true when weather type changes', () => {
      const prev: WeatherSnapshot = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear' as WeatherType,
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'entry1',
      };
      const current: WeatherSnapshot = {
        ...prev,
        weather: 'fog' as WeatherType,
        displayName: '雾',
        timelineEntryId: 'entry2',
      };
      expect(isWeatherChanged(prev, current)).toBe(true);
    });

    it('returns true when timeline entry changes but weather same', () => {
      const prev: WeatherSnapshot = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear' as WeatherType,
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'entry1',
      };
      const current: WeatherSnapshot = {
        ...prev,
        timelineEntryId: 'entry2',
      };
      expect(isWeatherChanged(prev, current)).toBe(true);
    });
  });
});
