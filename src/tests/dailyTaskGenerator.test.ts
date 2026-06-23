import { describe, it, expect } from 'vitest';
import { generateDailyTasks, buildDailyTaskSeed, hasWeatherCondition } from '@/domain/tasks/dailyTaskGenerator';
import { DAILY_TASK_DEFINITIONS, DAILY_TASKS_PER_DAY, MAX_STRICT_WEATHER_TASKS } from '@/domain/tasks/dailyTaskDefinitions';
import type { DailyTaskGenerationInput, DailyTaskDefinition } from '@/domain/tasks/dailyTaskTypes';

const BASE_INPUT: DailyTaskGenerationInput = {
  anonymousPlayerId: 'anon.player.local.v1',
  selectedCharacterId: 'character.player_male',
  localDate: '2025-06-18',
  mapId: 'map.urban_wasteland',
  dailyTaskPoolVersion: 'daily-tasks.v1',
  availableWeatherTypes: ['clear', 'overcast', 'light_rain', 'heavy_rain', 'fog'],
};

describe('dailyTaskGenerator', () => {
  describe('buildDailyTaskSeed', () => {
    it('builds deterministic seed string', () => {
      const seed = buildDailyTaskSeed(BASE_INPUT);
      expect(seed).toBe('anon.player.local.v1:character.player_male:2025-06-18:map.urban_wasteland:daily-tasks.v1');
    });

    it('produces different seeds for different dates', () => {
      const seed1 = buildDailyTaskSeed(BASE_INPUT);
      const seed2 = buildDailyTaskSeed({ ...BASE_INPUT, localDate: '2025-06-19' });
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('hasWeatherCondition', () => {
    it('returns false for tasks without weather condition', () => {
      const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === 'daily_collect_waste')!;
      expect(hasWeatherCondition(def)).toBe(false);
    });

    it('returns true for tasks with weather condition', () => {
      const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === 'daily_drainage_check')!;
      expect(hasWeatherCondition(def)).toBe(true);
    });
  });

  describe('generateDailyTasks', () => {
    it('generates exactly 3 tasks', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);
    });

    it('generates same tasks for same input (deterministic)', () => {
      const tasks1 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const tasks2 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      expect(tasks1).toEqual(tasks2);
    });

    it('generates no duplicate task IDs', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const ids = tasks.map((t) => t.taskId);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('includes at least 1 unconditional task', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const unconditionalCount = tasks.filter((t) => {
        const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === t.taskId);
        return def && !hasWeatherCondition(def);
      }).length;
      expect(unconditionalCount).toBeGreaterThanOrEqual(1);
    });

    it('includes at most 2 strict weather condition tasks', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const weatherCount = tasks.filter((t) => {
        const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === t.taskId);
        return def && hasWeatherCondition(def);
      }).length;
      expect(weatherCount).toBeLessThanOrEqual(MAX_STRICT_WEATHER_TASKS);
    });

    it('does not generate weather task if weather not in timeline', () => {
      // Only clear weather available
      const input: DailyTaskGenerationInput = {
        ...BASE_INPUT,
        availableWeatherTypes: ['clear'],
      };
      const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);

      // No task should require heavy_rain, fog, or light_rain exclusively
      for (const task of tasks) {
        const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === task.taskId);
        expect(def).toBeDefined();
        if (def && hasWeatherCondition(def)) {
          const supported = def.condition?.supportedWeather ?? [];
          // Must include 'clear' as a valid weather
          expect(supported).toContain('clear');
        }
      }
    });

    it('fills with normal tasks when weather tasks insufficient', () => {
      // Only clear weather available — weather tasks that don't support clear are filtered out
      // but unconditional tasks (2) + ecology_patrol (clear/overcast) = 3 available
      const input: DailyTaskGenerationInput = {
        ...BASE_INPUT,
        availableWeatherTypes: ['clear'],
      };
      const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
      expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);

      // All tasks should be unconditional or support clear weather
      for (const task of tasks) {
        const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === task.taskId);
        expect(def).toBeDefined();
        if (def && hasWeatherCondition(def)) {
          const supported = def.condition?.supportedWeather ?? [];
          expect(supported).toContain('clear');
        }
      }
    });

    it('does not use Math.random (deterministic for different run)', () => {
      const tasks1 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const tasks2 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      // Same seed → same output
      expect(JSON.stringify(tasks1)).toBe(JSON.stringify(tasks2));
    });

    it('can generate different tasks for different dates', () => {
      const tasks1 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const tasks2 = generateDailyTasks(
        { ...BASE_INPUT, localDate: '2025-06-19' },
        DAILY_TASK_DEFINITIONS,
      );
      // At least the instanceIds should differ
      const ids1 = tasks1.map((t) => t.instanceId);
      const ids2 = tasks2.map((t) => t.instanceId);
      expect(ids1).not.toEqual(ids2);
    });

    it('initializes tasks with available status and zero progress', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      for (const task of tasks) {
        expect(task.status).toBe('available');
        expect(task.progress).toBe(0);
        expect(task.rewardClaimed).toBe(false);
      }
    });

    it('sets correct targetValue from definitions', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      for (const task of tasks) {
        const def = DAILY_TASK_DEFINITIONS.find((d) => d.id === task.taskId);
        expect(def).toBeDefined();
        expect(task.targetValue).toBe(def!.targetValue);
      }
    });

    it('generates from at least 6 definitions', () => {
      expect(DAILY_TASK_DEFINITIONS.length).toBeGreaterThanOrEqual(6);
    });

    it('includes 2 unconditional, 2 rain, 1 clear/overcast, 1 fog definitions', () => {
      const unconditional = DAILY_TASK_DEFINITIONS.filter((d) => !hasWeatherCondition(d));
      expect(unconditional.length).toBeGreaterThanOrEqual(2);

      const rainTasks = DAILY_TASK_DEFINITIONS.filter(
        (d) => d.condition?.supportedWeather?.includes('light_rain') ||
                d.condition?.supportedWeather?.includes('heavy_rain'),
      );
      expect(rainTasks.length).toBeGreaterThanOrEqual(2);

      const clearOvercast = DAILY_TASK_DEFINITIONS.filter(
        (d) => d.condition?.supportedWeather?.includes('clear') &&
                d.condition?.supportedWeather?.includes('overcast'),
      );
      expect(clearOvercast.length).toBeGreaterThanOrEqual(1);

      const fog = DAILY_TASK_DEFINITIONS.filter(
        (d) => d.condition?.supportedWeather?.includes('fog'),
      );
      expect(fog.length).toBeGreaterThanOrEqual(1);
    });

    it('produces stable instanceId for same input', () => {
      const tasks1 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const tasks2 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      for (let i = 0; i < tasks1.length; i++) {
        expect(tasks1[i].instanceId).toBe(tasks2[i].instanceId);
      }
    });

    it('works with custom definition set', () => {
      const customDefs: DailyTaskDefinition[] = [
        {
          id: 'custom_1',
          version: 1,
          title: 'Custom 1',
          description: 'Test',
          npcId: 'npc_test',
          objectiveType: 'test',
          targetValue: 1,
          weight: 10,
        },
        {
          id: 'custom_2',
          version: 1,
          title: 'Custom 2',
          description: 'Test',
          npcId: 'npc_test',
          objectiveType: 'test2',
          targetValue: 1,
          weight: 10,
        },
        {
          id: 'custom_3',
          version: 1,
          title: 'Custom 3',
          description: 'Test',
          npcId: 'npc_test',
          objectiveType: 'test3',
          targetValue: 1,
          weight: 10,
        },
      ];
      const tasks = generateDailyTasks(BASE_INPUT, customDefs);
      expect(tasks).toHaveLength(3);
      expect(tasks.every((t) => customDefs.some((d) => d.id === t.taskId))).toBe(true);
    });
  });

  describe('backfill from safe pool when weather candidates insufficient', () => {
    it('generates exactly 3 tasks when availableWeatherTypes is empty', () => {
      const input: DailyTaskGenerationInput = {
        ...BASE_INPUT,
        availableWeatherTypes: [],
      };
      const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
      expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);
    });

    it('generates exactly 3 tasks with only fog weather', () => {
      const input: DailyTaskGenerationInput = {
        ...BASE_INPUT,
        availableWeatherTypes: ['fog'],
      };
      const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
      expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);
    });

    it('generates exactly 3 tasks with only heavy_rain weather', () => {
      const input: DailyTaskGenerationInput = {
        ...BASE_INPUT,
        availableWeatherTypes: ['heavy_rain'],
      };
      const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
      expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);
    });

    it('always generates 3 tasks across multiple seeds', () => {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= 28; d++) {
          const date = `2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const input: DailyTaskGenerationInput = {
            ...BASE_INPUT,
            localDate: date,
            availableWeatherTypes: [],
          };
          const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
          expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);

          // Verify uniqueness
          const taskIds = tasks.map((t) => t.taskId);
          const uniqueTaskIds = new Set(taskIds);
          expect(uniqueTaskIds.size).toBe(taskIds.length);

          const instanceIds = tasks.map((t) => t.instanceId);
          const uniqueInstanceIds = new Set(instanceIds);
          expect(uniqueInstanceIds.size).toBe(instanceIds.length);
        }
      }
    });

    it('fills 3 tasks even when only 2 unconditional tasks available and no weather', () => {
      const input: DailyTaskGenerationInput = {
        ...BASE_INPUT,
        availableWeatherTypes: [],
      };
      const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
      expect(tasks).toHaveLength(3);
      // Should include weather tasks from safe pool
      const taskIds = tasks.map((t) => t.taskId);
      const uniqueTaskIds = new Set(taskIds);
      expect(uniqueTaskIds.size).toBe(3);
    });

    it('throws when fewer than 3 definitions provided', () => {
      const smallDefs: DailyTaskDefinition[] = [
        { id: 'a', version: 1, title: 'A', description: '', npcId: 'n', objectiveType: 'a', targetValue: 1, weight: 1 },
        { id: 'b', version: 1, title: 'B', description: '', npcId: 'n', objectiveType: 'b', targetValue: 1, weight: 1 },
      ];
      expect(() => generateDailyTasks(BASE_INPUT, smallDefs)).toThrow();
    });
  });
});
