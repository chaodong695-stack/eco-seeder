/**
 * 每日任务唯一性测试 — 验证多种种子和多种天气时间线下的 taskId 和 instanceId 唯一性。
 */

import { describe, it, expect } from 'vitest';
import {
  generateDailyTasks,
  validateTaskUniqueness,
} from '@/domain/tasks/dailyTaskGenerator';
import { DAILY_TASK_DEFINITIONS, DAILY_TASKS_PER_DAY } from '@/domain/tasks/dailyTaskDefinitions';
import type { DailyTaskGenerationInput } from '@/domain/tasks/dailyTaskTypes';
import type { WeatherType } from '@/domain/weather/weatherTypes';

const BASE_INPUT: DailyTaskGenerationInput = {
  anonymousPlayerId: 'anon.player.local.v1',
  selectedCharacterId: 'character.player_male',
  localDate: '2025-06-18',
  mapId: 'map.urban_wasteland',
  dailyTaskPoolVersion: 'daily-tasks.v1',
  availableWeatherTypes: ['clear', 'overcast', 'light_rain', 'heavy_rain', 'fog'],
};

/** 多种天气时间线组合。 */
const WEATHER_TIMELINES: WeatherType[][] = [
  ['clear', 'overcast', 'light_rain', 'heavy_rain', 'fog'],
  ['clear', 'overcast'],
  ['clear'],
  ['light_rain', 'heavy_rain'],
  ['heavy_rain', 'fog'],
  ['fog'],
  ['clear', 'light_rain', 'fog'],
  ['overcast', 'heavy_rain'],
  ['clear', 'overcast', 'light_rain'],
  ['clear', 'overcast', 'light_rain', 'heavy_rain', 'fog', 'clear'],
];

/** 多种日期种子。 */
const DATES = [
  '2025-01-01',
  '2025-06-18',
  '2025-06-19',
  '2025-12-31',
  '2026-02-14',
  '2024-07-04',
];

/** 多种玩家 ID 种子。 */
const PLAYER_IDS = [
  'anon.player.local.v1',
  'player.alpha',
  'player.beta',
  'player.gamma',
];

describe('dailyTaskUniqueness', () => {
  describe('validateTaskUniqueness', () => {
    it('passes for unique tasks', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      expect(() => validateTaskUniqueness(tasks)).not.toThrow();
    });

    it('throws for duplicate taskIds', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const duplicated = [...tasks, { ...tasks[0], instanceId: 'different-id' }];
      expect(() => validateTaskUniqueness(duplicated)).toThrow('Duplicate taskId');
    });

    it('throws for duplicate instanceIds', () => {
      const tasks = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const duplicated = [...tasks, { ...tasks[0], taskId: 'different-task' }];
      expect(() => validateTaskUniqueness(duplicated)).toThrow('Duplicate instanceId');
    });
  });

  describe('uniqueness across multiple seeds and weather timelines', () => {
    for (const playerId of PLAYER_IDS) {
      for (const date of DATES) {
        for (const weatherTypes of WEATHER_TIMELINES) {
          const label = `${playerId}/${date}/[${weatherTypes.join(',')}]`;
          it(`generates unique tasks for ${label}`, () => {
            const input: DailyTaskGenerationInput = {
              ...BASE_INPUT,
              anonymousPlayerId: playerId,
              localDate: date,
              availableWeatherTypes: weatherTypes,
            };
            const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);

            // 恰好 3 个任务（除非候选不足）
            if (weatherTypes.length > 0) {
              expect(tasks).toHaveLength(DAILY_TASKS_PER_DAY);
            }

            // taskId 唯一
            const taskIds = tasks.map((t) => t.taskId);
            const uniqueTaskIds = new Set(taskIds);
            expect(uniqueTaskIds.size).toBe(taskIds.length);

            // instanceId 唯一
            const instanceIds = tasks.map((t) => t.instanceId);
            const uniqueInstanceIds = new Set(instanceIds);
            expect(uniqueInstanceIds.size).toBe(instanceIds.length);

            // validateTaskUniqueness 不抛出
            expect(() => validateTaskUniqueness(tasks)).not.toThrow();
          });
        }
      }
    }
  });

  describe('instanceId stability', () => {
    it('same input always produces same instanceIds', () => {
      const tasks1 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const tasks2 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      for (let i = 0; i < tasks1.length; i++) {
        expect(tasks1[i].instanceId).toBe(tasks2[i].instanceId);
        expect(tasks1[i].taskId).toBe(tasks2[i].taskId);
      }
    });

    it('different dates produce different instanceIds', () => {
      const tasks1 = generateDailyTasks(BASE_INPUT, DAILY_TASK_DEFINITIONS);
      const tasks2 = generateDailyTasks(
        { ...BASE_INPUT, localDate: '2025-06-19' },
        DAILY_TASK_DEFINITIONS,
      );
      const ids1 = new Set(tasks1.map((t) => t.instanceId));
      const ids2 = new Set(tasks2.map((t) => t.instanceId));
      // No overlap (different dates → different seeds → different instanceIds)
      for (const id of ids1) {
        expect(ids2.has(id)).toBe(false);
      }
    });
  });

  describe('no duplicate React keys (instanceId)', () => {
    it('all instanceIds are distinct strings suitable for React keys', () => {
      // Run 20 times with different dates to stress test
      for (let i = 0; i < 20; i++) {
        const input = {
          ...BASE_INPUT,
          localDate: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        };
        const tasks = generateDailyTasks(input, DAILY_TASK_DEFINITIONS);
        const instanceIds = tasks.map((t) => t.instanceId);
        const unique = new Set(instanceIds);
        expect(unique.size).toBe(instanceIds.length);
        // All instanceIds should be non-empty strings
        for (const id of instanceIds) {
          expect(typeof id).toBe('string');
          expect(id.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
