/**
 * 天气门控进度测试 — 验证 Store 层在处理 PROGRESS_SIGNAL 时校验当前天气。
 *
 * 覆盖 Issue #16 第 3 点：
 * - 暴雨垃圾仅在 heavy_rain 下可计入任务进度；
 * - 排水设施仅在 light_rain 或 heavy_rain 下可计入任务进度；
 * - 条件不满足时不增加进度。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';

// Mutable mock for weather
let mockDisplayWeather: string = 'clear';

vi.mock('@/store/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      timeSnapshot: { localDate: '2025-06-18' },
      getWeatherTimeline: () => ({
        date: '2025-06-18',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [
          { id: '1', startMinute: 0, endMinute: 360, weather: 'clear', intensity: 0.2 },
          { id: '2', startMinute: 361, endMinute: 720, weather: 'light_rain', intensity: 0.6 },
          { id: '3', startMinute: 721, endMinute: 1080, weather: 'heavy_rain', intensity: 0.9 },
          { id: '4', startMinute: 1081, endMinute: 1439, weather: 'fog', intensity: 0.7 },
        ],
      }),
      getDisplayWeather: () => mockDisplayWeather as 'clear' | 'light_rain' | 'heavy_rain' | 'fog' | 'overcast',
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock playerStore
vi.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      character: { characterId: 'character.player_male', gender: 'male', displayName: '男性生态修复员' },
    }),
  },
}));

vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}));

function setWeather(weather: string): void {
  mockDisplayWeather = weather;
}

describe('dailyTaskWeatherGating', () => {
  beforeEach(() => {
    localStorage.clear();
    useEnvironmentStore.getState().resetEnvironment();
    useDailyTaskStore.getState().resetDailyTasks();
    vi.clearAllMocks();
    setWeather('clear');
  });

  describe('storm waste task', () => {
    it('does not progress in clear weather', () => {
      setWeather('clear');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const stormTask = tasks.find((t) => t.taskId === 'daily_storm_waste');
      if (!stormTask) return;

      useDailyTaskStore.getState().acceptTask(stormTask.instanceId);
      const def = findDailyTaskById(stormTask.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === stormTask.instanceId,
      );
      expect(updated?.progress).toBe(0);
    });

    it('progresses in heavy_rain weather', () => {
      setWeather('heavy_rain');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const stormTask = tasks.find((t) => t.taskId === 'daily_storm_waste');
      if (!stormTask) return;

      useDailyTaskStore.getState().acceptTask(stormTask.instanceId);
      const def = findDailyTaskById(stormTask.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === stormTask.instanceId,
      );
      expect(updated?.progress).toBe(1);
    });

    it('does not progress in light_rain weather', () => {
      setWeather('light_rain');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const stormTask = tasks.find((t) => t.taskId === 'daily_storm_waste');
      if (!stormTask) return;

      useDailyTaskStore.getState().acceptTask(stormTask.instanceId);
      const def = findDailyTaskById(stormTask.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === stormTask.instanceId,
      );
      expect(updated?.progress).toBe(0);
    });
  });

  describe('drainage check task', () => {
    it('does not progress in clear weather', () => {
      setWeather('clear');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const drainageTask = tasks.find((t) => t.taskId === 'daily_drainage_check');
      if (!drainageTask) return;

      useDailyTaskStore.getState().acceptTask(drainageTask.instanceId);
      const def = findDailyTaskById(drainageTask.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === drainageTask.instanceId,
      );
      expect(updated?.progress).toBe(0);
    });

    it('progresses in light_rain weather', () => {
      setWeather('light_rain');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const drainageTask = tasks.find((t) => t.taskId === 'daily_drainage_check');
      if (!drainageTask) return;

      useDailyTaskStore.getState().acceptTask(drainageTask.instanceId);
      const def = findDailyTaskById(drainageTask.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === drainageTask.instanceId,
      );
      expect(updated?.progress).toBe(1);
    });

    it('progresses in heavy_rain weather', () => {
      setWeather('heavy_rain');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const drainageTask = tasks.find((t) => t.taskId === 'daily_drainage_check');
      if (!drainageTask) return;

      useDailyTaskStore.getState().acceptTask(drainageTask.instanceId);
      const def = findDailyTaskById(drainageTask.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === drainageTask.instanceId,
      );
      expect(updated?.progress).toBe(1);
    });
  });

  describe('unconditional tasks progress in any weather', () => {
    it('progresses in clear weather', () => {
      setWeather('clear');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const unconditional = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      if (!unconditional) return;

      useDailyTaskStore.getState().acceptTask(unconditional.instanceId);
      const def = findDailyTaskById(unconditional.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === unconditional.instanceId,
      );
      expect(updated?.progress).toBe(1);
    });

    it('progresses in heavy_rain weather', () => {
      setWeather('heavy_rain');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const unconditional = tasks.find((t) => {
        const def = findDailyTaskById(t.taskId);
        return def && !def.condition?.supportedWeather;
      });
      if (!unconditional) return;

      useDailyTaskStore.getState().acceptTask(unconditional.instanceId);
      const def = findDailyTaskById(unconditional.taskId)!;

      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'test-src-1',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === unconditional.instanceId,
      );
      expect(updated?.progress).toBe(1);
    });
  });

  describe('weather switching does not duplicate sourceId progress', () => {
    it('same sourceId only contributes once across weather changes', () => {
      // Start in heavy_rain
      setWeather('heavy_rain');
      useDailyTaskStore.getState().init();
      const tasks = useDailyTaskStore.getState().tasks;
      const stormTask = tasks.find((t) => t.taskId === 'daily_storm_waste');
      if (!stormTask) return;

      useDailyTaskStore.getState().acceptTask(stormTask.instanceId);
      const def = findDailyTaskById(stormTask.taskId)!;

      // Progress in heavy_rain
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'storm-debris-01',
      });

      // Switch to clear — progress blocked but sourceId already consumed
      setWeather('clear');
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'storm-debris-01',
      });

      // Switch back to heavy_rain — sourceId already consumed, no duplicate
      setWeather('heavy_rain');
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: 'storm-debris-01',
      });

      const updated = useDailyTaskStore.getState().tasks.find(
        (t) => t.instanceId === stormTask.instanceId,
      );
      expect(updated?.progress).toBe(1);
    });
  });
});
