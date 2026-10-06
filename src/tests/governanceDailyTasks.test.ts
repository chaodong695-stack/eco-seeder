import { beforeEach, describe, expect, it } from 'vitest';
import { useGovernanceStore } from '@/store/governanceStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { GOVERNANCE_POINTS } from '@/domain/governance/governanceDefinitions';
import type { DailyTaskInstance } from '@/domain/tasks/dailyTaskTypes';

function task(taskId: string, targetValue: number): DailyTaskInstance {
  return { taskId, instanceId: taskId, targetValue, progress: 0, status: 'available', rewardClaimed: false, localDate: '2026-10-06', mapId: 'map.urban_wasteland' };
}

describe('daily tasks recognize completed fixed governance', () => {
  beforeEach(() => {
    localStorage.clear(); useEnvironmentStore.getState().resetEnvironment();
    useDailyTaskStore.getState().resetDailyTasks(); useGovernanceStore.getState().reset();
    useGovernanceStore.getState().beginSession('male'); useGovernanceStore.getState().acceptMission();
  });

  it('can accept cleanup and repair tasks after the same sites were already governed', () => {
    for (const p of GOVERNANCE_POINTS.filter(p => p.id !== 'monitor.verify')) {
      useGovernanceStore.getState().enterRegion(p.region, p.sourceId);
      useGovernanceStore.getState().completeOperation(p.id, p.correctOptionId, 2000);
    }
    useDailyTaskStore.setState({ tasks: [task('daily_collect_waste', 1), task('daily_restore_area', 2)] });
    useDailyTaskStore.getState().acceptTask('daily_collect_waste');
    useDailyTaskStore.getState().acceptTask('daily_restore_area');
    expect(useDailyTaskStore.getState().tasks.map(t => t.status)).toEqual(['completed', 'completed']);
    expect(useDailyTaskStore.getState().tasks.map(t => t.progress)).toEqual([1, 2]);
    const effects = useEnvironmentStore.getState().appliedTargetIds.size;
    expect(useDailyTaskStore.getState().acceptTask('daily_restore_area')).toBe(false);
    expect(useEnvironmentStore.getState().appliedTargetIds.size).toBe(effects);
  });

  it('reconciles a previously accepted task after governance progress was restored', () => {
    for (const p of GOVERNANCE_POINTS.filter(p => p.id !== 'monitor.verify')) {
      useGovernanceStore.getState().enterRegion(p.region, p.sourceId);
      useGovernanceStore.getState().completeOperation(p.id, p.correctOptionId, 2000);
    }
    useDailyTaskStore.setState({ isInitialized: true, tasks: [
      { ...task('daily_collect_waste', 1), status: 'active' },
      { ...task('daily_restore_area', 2), status: 'active' },
    ] });
    useDailyTaskStore.getState().init();
    expect(useDailyTaskStore.getState().tasks.map(t => t.status)).toEqual(['completed', 'completed']);
  });
});
