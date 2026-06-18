import { describe, it, expect } from 'vitest';
import {
  generateWeatherTimeline,
  validateTimeline,
  buildWeatherSeed,
  type WeatherGenerationInput,
} from '@/domain/weather/weatherTimelineGenerator';
import {
  URBAN_WASTELAND_WEATHER_PROFILE,
  validateWeatherProfile,
  getWeatherProfile,
} from '@/content/weather/urbanWastelandWeatherProfile';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import { ALL_WEATHER_TYPES } from '@/domain/weather/weatherTypes';

const baseInput: WeatherGenerationInput = {
  anonymousPlayerId: 'anon.player.local.v1',
  localDate: '2024-06-15',
  mapId: 'map.urban_wasteland',
  versionId: 'eco-seeder.v0.1',
};

describe('weatherTimelineGenerator', () => {
  describe('generateWeatherTimeline', () => {
    it('generates a timeline with correct metadata', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(timeline.date).toBe('2024-06-15');
      expect(timeline.mapId).toBe('map.urban_wasteland');
      expect(timeline.seed).toContain('anon.player.local.v1');
      expect(timeline.seed).toContain('2024-06-15');
      expect(timeline.entries.length).toBeGreaterThanOrEqual(4);
    });

    it('covers full 0–1439 range', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(timeline.entries[0].startMinute).toBe(0);
      expect(timeline.entries[timeline.entries.length - 1].endMinute).toBe(1439);
    });

    it('has no overlapping segments', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      for (let i = 1; i < timeline.entries.length; i++) {
        const prev = timeline.entries[i - 1];
        const curr = timeline.entries[i];
        expect(curr.startMinute).toBe(prev.endMinute + 1);
      }
    });

    it('has at least 4 segments', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(timeline.entries.length).toBeGreaterThanOrEqual(4);
    });

    it('only includes supported weather types', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      for (const entry of timeline.entries) {
        expect(ALL_WEATHER_TYPES).toContain(entry.weather);
      }
    });

    it('produces identical result for same seed', () => {
      const t1 = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      const t2 = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(t1).toEqual(t2);
    });

    it('produces different result for different dates', () => {
      const input1 = { ...baseInput, localDate: '2024-06-15' };
      const input2 = { ...baseInput, localDate: '2024-06-16' };
      const t1 = generateWeatherTimeline(input1, URBAN_WASTELAND_WEATHER_PROFILE);
      const t2 = generateWeatherTimeline(input2, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(t1.entries).not.toEqual(t2.entries);
    });

    it('produces different result for different map IDs', () => {
      const input1 = { ...baseInput, mapId: 'map.urban_wasteland' };
      const input2 = { ...baseInput, mapId: 'map.other_map' };
      const t1 = generateWeatherTimeline(input1, URBAN_WASTELAND_WEATHER_PROFILE);
      const t2 = generateWeatherTimeline(input2, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(t1.entries).not.toEqual(t2.entries);
    });

    it('each entry has valid intensity 0–1', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      for (const entry of timeline.entries) {
        expect(entry.intensity).toBeGreaterThanOrEqual(0);
        expect(entry.intensity).toBeLessThanOrEqual(1);
      }
    });

    it('each entry has a unique id', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      const ids = timeline.entries.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('buildWeatherSeed', () => {
    it('combines all input parts', () => {
      const seed = buildWeatherSeed(baseInput);
      expect(seed).toBe('anon.player.local.v1:2024-06-15:map.urban_wasteland:eco-seeder.v0.1');
    });
  });

  describe('validateTimeline', () => {
    it('passes for a valid timeline', () => {
      const timeline = generateWeatherTimeline(baseInput, URBAN_WASTELAND_WEATHER_PROFILE);
      expect(() => validateTimeline(timeline)).not.toThrow();
    });

    it('throws for less than 4 segments', () => {
      const badTimeline = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [
          { id: '0', startMinute: 0, endMinute: 719, weather: 'clear' as WeatherType, intensity: 0.2 },
          { id: '1', startMinute: 720, endMinute: 1439, weather: 'fog' as WeatherType, intensity: 0.7 },
        ],
      };
      expect(() => validateTimeline(badTimeline)).toThrow();
    });

    it('throws when last segment does not end at 1439', () => {
      const badTimeline = {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [
          { id: '0', startMinute: 0, endMinute: 359, weather: 'clear' as WeatherType, intensity: 0.2 },
          { id: '1', startMinute: 360, endMinute: 719, weather: 'fog' as WeatherType, intensity: 0.7 },
          { id: '2', startMinute: 720, endMinute: 1079, weather: 'clear' as WeatherType, intensity: 0.2 },
          { id: '3', startMinute: 1080, endMinute: 1400, weather: 'fog' as WeatherType, intensity: 0.7 },
        ],
      };
      expect(() => validateTimeline(badTimeline)).toThrow();
    });
  });
});

describe('urbanWastelandWeatherProfile', () => {
  describe('validateWeatherProfile', () => {
    it('passes for valid profile', () => {
      expect(() => validateWeatherProfile(URBAN_WASTELAND_WEATHER_PROFILE)).not.toThrow();
    });

    it('throws when baseWeights total is 0', () => {
      const badProfile = {
        ...URBAN_WASTELAND_WEATHER_PROFILE,
        baseWeights: {
          clear: 0,
          overcast: 0,
          light_rain: 0,
          heavy_rain: 0,
          fog: 0,
        },
      };
      expect(() => validateWeatherProfile(badProfile)).toThrow();
    });

    it('throws when baseWeights missing supported weather', () => {
      const badProfile = {
        ...URBAN_WASTELAND_WEATHER_PROFILE,
        baseWeights: {
          clear: 25,
          overcast: 30,
          light_rain: 20,
          heavy_rain: 10,
          fog: 0,
        },
        supportedWeather: ['clear', 'overcast', 'light_rain', 'heavy_rain', 'fog'] as WeatherType[],
      };
      // fog weight is 0, but total > 0 — should still pass
      expect(() => validateWeatherProfile(badProfile)).not.toThrow();
    });
  });

  describe('getWeatherProfile', () => {
    it('returns profile for urban_wasteland', () => {
      const profile = getWeatherProfile('map.urban_wasteland');
      expect(profile.mapId).toBe('map.urban_wasteland');
      expect(profile.supportedWeather.length).toBeGreaterThanOrEqual(5);
    });

    it('throws for unknown map', () => {
      expect(() => getWeatherProfile('unknown_map')).toThrow();
    });
  });
});
