import { describe, it, expect } from 'vitest';
import {
  isWeatherConditionMet,
  isWeatherConditionPossibleInTimeline,
  extractWeatherTypesFromTimeline,
  resolveTaskStatus,
  getWaitingWeatherText,
} from '@/domain/tasks/dailyTaskConditionResolver';
import { DAILY_TASK_DEFINITIONS } from '@/domain/tasks/dailyTaskDefinitions';
import type { DailyTaskDefinition } from '@/domain/tasks/dailyTaskTypes';
import type { WeatherType } from '@/domain/weather/weatherTypes';

function findDef(id: string): DailyTaskDefinition {
  const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === id);
  if (!def) throw new Error(`Definition ${id} not found`);
  return def;
}

describe('dailyTaskConditionResolver', () => {
  describe('isWeatherConditionMet', () => {
    it('returns true for unconditional task with any weather', () => {
      const def = findDef('daily_collect_waste');
      expect(isWeatherConditionMet(def, 'clear')).toBe(true);
      expect(isWeatherConditionMet(def, 'heavy_rain')).toBe(true);
      expect(isWeatherConditionMet(def, 'fog')).toBe(true);
    });

    it('returns true for rain task in light_rain', () => {
      const def = findDef('daily_drainage_check');
      expect(isWeatherConditionMet(def, 'light_rain')).toBe(true);
    });

    it('returns true for rain task in heavy_rain', () => {
      const def = findDef('daily_drainage_check');
      expect(isWeatherConditionMet(def, 'heavy_rain')).toBe(true);
    });

    it('returns false for rain task in clear weather', () => {
      const def = findDef('daily_drainage_check');
      expect(isWeatherConditionMet(def, 'clear')).toBe(false);
    });

    it('returns true for storm_waste task in heavy_rain', () => {
      const def = findDef('daily_storm_waste');
      expect(isWeatherConditionMet(def, 'heavy_rain')).toBe(true);
    });

    it('returns false for storm_waste task in light_rain', () => {
      const def = findDef('daily_storm_waste');
      expect(isWeatherConditionMet(def, 'light_rain')).toBe(false);
    });

    it('returns true for ecology_patrol in clear', () => {
      const def = findDef('daily_ecology_patrol');
      expect(isWeatherConditionMet(def, 'clear')).toBe(true);
    });

    it('returns true for ecology_patrol in overcast', () => {
      const def = findDef('daily_ecology_patrol');
      expect(isWeatherConditionMet(def, 'overcast')).toBe(true);
    });

    it('returns false for ecology_patrol in heavy_rain', () => {
      const def = findDef('daily_ecology_patrol');
      expect(isWeatherConditionMet(def, 'heavy_rain')).toBe(false);
    });

    it('returns true for fog task in fog', () => {
      const def = findDef('daily_fog_hazard_marking');
      expect(isWeatherConditionMet(def, 'fog')).toBe(true);
    });

    it('returns false for fog task in clear', () => {
      const def = findDef('daily_fog_hazard_marking');
      expect(isWeatherConditionMet(def, 'clear')).toBe(false);
    });
  });

  describe('isWeatherConditionPossibleInTimeline', () => {
    it('returns true for unconditional task', () => {
      const def = findDef('daily_collect_waste');
      expect(isWeatherConditionPossibleInTimeline(def, [])).toBe(true);
    });

    it('returns true when timeline contains supported weather', () => {
      const def = findDef('daily_drainage_check');
      expect(isWeatherConditionPossibleInTimeline(def, ['clear', 'light_rain'])).toBe(true);
    });

    it('returns false when timeline does not contain supported weather', () => {
      const def = findDef('daily_storm_waste');
      expect(isWeatherConditionPossibleInTimeline(def, ['clear', 'overcast'])).toBe(false);
    });

    it('returns true for fog task when fog is in timeline', () => {
      const def = findDef('daily_fog_hazard_marking');
      expect(isWeatherConditionPossibleInTimeline(def, ['fog'])).toBe(true);
    });
  });

  describe('extractWeatherTypesFromTimeline', () => {
    it('extracts unique weather types from timeline entries', () => {
      const entries = [
        { weather: 'clear' as WeatherType },
        { weather: 'overcast' as WeatherType },
        { weather: 'light_rain' as WeatherType },
        { weather: 'light_rain' as WeatherType },
        { weather: 'heavy_rain' as WeatherType },
      ];
      const result = extractWeatherTypesFromTimeline(entries);
      expect(result).toHaveLength(4);
      expect(result).toContain('clear');
      expect(result).toContain('overcast');
      expect(result).toContain('light_rain');
      expect(result).toContain('heavy_rain');
    });

    it('returns empty array for empty timeline', () => {
      expect(extractWeatherTypesFromTimeline([])).toEqual([]);
    });
  });

  describe('resolveTaskStatus', () => {
    it('keeps completed status', () => {
      const def = findDef('daily_drainage_check');
      const status = resolveTaskStatus(def, 'completed', 'clear');
      expect(status).toBe('completed');
    });

    it('keeps available status', () => {
      const def = findDef('daily_drainage_check');
      const status = resolveTaskStatus(def, 'available', 'clear');
      expect(status).toBe('available');
    });

    it('transitions active to waiting_condition when weather does not match', () => {
      const def = findDef('daily_drainage_check');
      const status = resolveTaskStatus(def, 'active', 'clear');
      expect(status).toBe('waiting_condition');
    });

    it('keeps active when weather matches', () => {
      const def = findDef('daily_drainage_check');
      const status = resolveTaskStatus(def, 'active', 'light_rain');
      expect(status).toBe('active');
    });

    it('transitions waiting_condition back to active when weather matches', () => {
      const def = findDef('daily_drainage_check');
      const status = resolveTaskStatus(def, 'waiting_condition', 'heavy_rain');
      expect(status).toBe('active');
    });

    it('keeps waiting_condition when weather still does not match', () => {
      const def = findDef('daily_drainage_check');
      const status = resolveTaskStatus(def, 'waiting_condition', 'clear');
      expect(status).toBe('waiting_condition');
    });

    it('keeps active for unconditional task in any weather', () => {
      const def = findDef('daily_collect_waste');
      expect(resolveTaskStatus(def, 'active', 'clear')).toBe('active');
      expect(resolveTaskStatus(def, 'active', 'heavy_rain')).toBe('active');
      expect(resolveTaskStatus(def, 'active', 'fog')).toBe('active');
    });
  });

  describe('getWaitingWeatherText', () => {
    it('returns empty string for unconditional task', () => {
      const def = findDef('daily_collect_waste');
      expect(getWaitingWeatherText(def)).toBe('');
    });

    it('returns weather types for conditional task', () => {
      const def = findDef('daily_drainage_check');
      const text = getWaitingWeatherText(def);
      expect(text).toContain('light_rain');
      expect(text).toContain('heavy_rain');
    });
  });
});
