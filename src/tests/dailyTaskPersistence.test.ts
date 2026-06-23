import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDailyTasks,
  loadDailyTasks,
  clearDailyTasks,
  isPersistDataValid,
  DAILY_TASKS_STORAGE_KEY,
} from '@/domain/tasks/dailyTaskPersistence';
import type { DailyTaskPersistData } from '@/domain/tasks/dailyTaskPersistence';
import type { DailyTaskInstance } from '@/domain/tasks/dailyTaskTypes';

function makeInstance(overrides: Partial<DailyTaskInstance> = {}): DailyTaskInstance {
  return {
    instanceId: 'inst-1',
    taskId: 'daily_test',
    localDate: '2025-06-18',
    mapId: 'map.urban_wasteland',
    status: 'available',
    progress: 0,
    targetValue: 3,
    rewardClaimed: false,
    ...overrides,
  };
}

function makePersistData(overrides: Partial<DailyTaskPersistData> = {}): DailyTaskPersistData {
  return {
    date: '2025-06-18',
    mapId: 'map.urban_wasteland',
    poolVersion: 'daily-tasks.v1',
    selectedCharacterId: 'character.player_male',
    tasks: [makeInstance()],
    contributedSources: [],
    restorationProgress: 0,
    ...overrides,
  };
}

describe('dailyTaskPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveDailyTasks / loadDailyTasks', () => {
    it('saves and loads valid data', () => {
      const data = makePersistData();
      saveDailyTasks(data);
      const loaded = loadDailyTasks();
      expect(loaded).not.toBeNull();
      expect(loaded!.date).toBe('2025-06-18');
      expect(loaded!.tasks).toHaveLength(1);
      expect(loaded!.tasks[0].taskId).toBe('daily_test');
    });

    it('returns null when no data exists', () => {
      const loaded = loadDailyTasks();
      expect(loaded).toBeNull();
    });

    it('returns null for corrupted JSON', () => {
      localStorage.setItem(DAILY_TASKS_STORAGE_KEY, '{invalid json');
      const loaded = loadDailyTasks();
      expect(loaded).toBeNull();
    });

    it('returns null for invalid schema', () => {
      localStorage.setItem(
        DAILY_TASKS_STORAGE_KEY,
        JSON.stringify({ date: '2025-06-18', wrongField: true }),
      );
      const loaded = loadDailyTasks();
      expect(loaded).toBeNull();
    });

    it('returns null for invalid task status', () => {
      const data = makePersistData();
      data.tasks[0].status = 'invalid_status' as DailyTaskInstance['status'];
      localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(data));
      const loaded = loadDailyTasks();
      expect(loaded).toBeNull();
    });

    it('returns null for negative progress', () => {
      const data = makePersistData();
      data.tasks[0].progress = -1;
      localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(data));
      const loaded = loadDailyTasks();
      expect(loaded).toBeNull();
    });

    it('returns null for zero target value', () => {
      const data = makePersistData();
      data.tasks[0].targetValue = 0;
      localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(data));
      const loaded = loadDailyTasks();
      expect(loaded).toBeNull();
    });
  });

  describe('clearDailyTasks', () => {
    it('removes data from localStorage', () => {
      saveDailyTasks(makePersistData());
      expect(loadDailyTasks()).not.toBeNull();
      clearDailyTasks();
      expect(loadDailyTasks()).toBeNull();
    });

    it('does not throw when no data exists', () => {
      expect(() => clearDailyTasks()).not.toThrow();
    });
  });

  describe('isPersistDataValid', () => {
    it('returns true for matching date, map, version, and character', () => {
      const data = makePersistData();
      expect(isPersistDataValid(data, '2025-06-18', 'map.urban_wasteland', 'daily-tasks.v1', 'character.player_male')).toBe(true);
    });

    it('returns false for different date', () => {
      const data = makePersistData();
      expect(isPersistDataValid(data, '2025-06-19', 'map.urban_wasteland', 'daily-tasks.v1', 'character.player_male')).toBe(false);
    });

    it('returns false for different map', () => {
      const data = makePersistData();
      expect(isPersistDataValid(data, '2025-06-18', 'map.other', 'daily-tasks.v1', 'character.player_male')).toBe(false);
    });

    it('returns false for different version', () => {
      const data = makePersistData();
      expect(isPersistDataValid(data, '2025-06-18', 'map.urban_wasteland', 'daily-tasks.v2', 'character.player_male')).toBe(false);
    });

    it('returns false for different character', () => {
      const data = makePersistData();
      expect(isPersistDataValid(data, '2025-06-18', 'map.urban_wasteland', 'daily-tasks.v1', 'character.player_female')).toBe(false);
    });

    it('returns false for null data', () => {
      expect(isPersistDataValid(null, '2025-06-18', 'map.urban_wasteland', 'daily-tasks.v1', 'character.player_male')).toBe(false);
    });
  });

  describe('old version data', () => {
    it('old version data is safely invalidated', () => {
      // Simulate old version data
      const oldData = {
        date: '2025-06-18',
        mapId: 'map.urban_wasteland',
        poolVersion: 'daily-tasks.v0',
        tasks: [makeInstance()],
      };
      localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(oldData));
      const loaded = loadDailyTasks();
      // Data loads fine (schema is valid) but version doesn't match
      expect(loaded).not.toBeNull();
      expect(isPersistDataValid(loaded, '2025-06-18', 'map.urban_wasteland', 'daily-tasks.v1', 'character.player_male')).toBe(false);
    });
  });
});
