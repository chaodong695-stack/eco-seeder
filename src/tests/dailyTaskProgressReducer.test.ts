import { describe, it, expect } from 'vitest';
import { reduceTaskProgress } from '@/domain/tasks/dailyTaskProgressReducer';
import type { DailyTaskInstance, TaskProgressSignal } from '@/domain/tasks/dailyTaskTypes';

function makeInstance(overrides: Partial<DailyTaskInstance> = {}): DailyTaskInstance {
  return {
    instanceId: 'inst-1',
    taskId: 'daily_test',
    localDate: '2025-06-18',
    mapId: 'map.urban_wasteland',
    status: 'active',
    progress: 0,
    targetValue: 3,
    rewardClaimed: false,
    ...overrides,
  };
}

describe('dailyTaskProgressReducer', () => {
  describe('reduceTaskProgress', () => {
    it('increases progress for active task', () => {
      const inst = makeInstance({ progress: 0, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.changed).toBe(true);
      expect(result.instance.progress).toBe(1);
      expect(result.instance.status).toBe('active');
    });

    it('completes task when progress reaches target', () => {
      const inst = makeInstance({ progress: 2, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.changed).toBe(true);
      expect(result.justCompleted).toBe(true);
      expect(result.instance.progress).toBe(3);
      expect(result.instance.status).toBe('completed');
      expect(result.instance.rewardClaimed).toBe(true);
    });

    it('does not exceed target value', () => {
      const inst = makeInstance({ progress: 2, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 5 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.instance.progress).toBe(3);
    });

    it('does not process completed task', () => {
      const inst = makeInstance({ status: 'completed', progress: 3, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.changed).toBe(false);
      expect(result.instance).toBe(inst);
    });

    it('does not process available task', () => {
      const inst = makeInstance({ status: 'available' });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.changed).toBe(false);
    });

    it('does not process waiting_condition task', () => {
      const inst = makeInstance({ status: 'waiting_condition' });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.changed).toBe(false);
    });

    it('prevents duplicate source contribution', () => {
      const inst = makeInstance({ progress: 0, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1, sourceId: 'src-1' };

      const result1 = reduceTaskProgress(inst, signal, sources);
      expect(result1.changed).toBe(true);
      expect(result1.instance.progress).toBe(1);

      // Second contribution from same source
      const inst2 = makeInstance({ progress: 1, targetValue: 3 });
      const result2 = reduceTaskProgress(inst2, signal, sources);
      expect(result2.changed).toBe(false);
      expect(result2.instance.progress).toBe(1);
    });

    it('allows different sources to contribute', () => {
      const inst = makeInstance({ progress: 0, targetValue: 3 });
      const sources = new Set<string>();

      const signal1: TaskProgressSignal = { objectiveType: 'test', amount: 1, sourceId: 'src-1' };
      const result1 = reduceTaskProgress(inst, signal1, sources);
      expect(result1.changed).toBe(true);

      const inst2 = makeInstance({ progress: 1, targetValue: 3 });
      const signal2: TaskProgressSignal = { objectiveType: 'test', amount: 1, sourceId: 'src-2' };
      const result2 = reduceTaskProgress(inst2, signal2, sources);
      expect(result2.changed).toBe(true);
      expect(result2.instance.progress).toBe(2);
    });

    it('does not change when amount is 0', () => {
      const inst = makeInstance({ progress: 1, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 0 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.changed).toBe(false);
    });

    it('does not mutate original instance', () => {
      const inst = makeInstance({ progress: 0, targetValue: 3 });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      reduceTaskProgress(inst, signal, sources);
      expect(inst.progress).toBe(0);
    });

    it('sets rewardClaimed to true on completion', () => {
      const inst = makeInstance({ progress: 2, targetValue: 3, rewardClaimed: false });
      const sources = new Set<string>();
      const signal: TaskProgressSignal = { objectiveType: 'test', amount: 1 };
      const result = reduceTaskProgress(inst, signal, sources);
      expect(result.instance.rewardClaimed).toBe(true);
    });
  });
});
