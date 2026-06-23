import { describe, it, expect } from 'vitest';
import { resolveDailyTaskDialog } from '@/game/npc/dailyTaskDialogResolver';
import type { DailyTaskInstance } from '@/domain/tasks/dailyTaskTypes';

function makeInstance(overrides: Partial<DailyTaskInstance> = {}): DailyTaskInstance {
  return {
    instanceId: 'inst-1',
    taskId: 'daily_drainage_check',
    localDate: '2025-06-18',
    mapId: 'map.urban_wasteland',
    status: 'available',
    progress: 0,
    targetValue: 2,
    rewardClaimed: false,
    ...overrides,
  };
}

describe('dailyTaskDialogResolver', () => {
  it('shows available tasks with accept options', () => {
    const tasks = [
      makeInstance({ taskId: 'daily_drainage_check', status: 'available' }),
      makeInstance({ instanceId: 'inst-2', taskId: 'daily_storm_waste', status: 'available' }),
    ];
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', tasks);

    expect(dialog.npcName).toBe('巡查员');
    expect(dialog.npcRole).toBe('环境巡查员');
    expect(dialog.lines.length).toBeGreaterThan(0);

    const acceptOptions = dialog.options.filter((o) => o.action === 'accept_one');
    expect(acceptOptions).toHaveLength(2);
  });

  it('shows waiting condition status', () => {
    const tasks = [
      makeInstance({ taskId: 'daily_drainage_check', status: 'waiting_condition' }),
    ];
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', tasks);

    expect(dialog.lines.some((l) => l.includes('等待天气'))).toBe(true);
    const closeOptions = dialog.options.filter((o) => o.action === 'close');
    expect(closeOptions).toHaveLength(1);
  });

  it('shows active progress', () => {
    const tasks = [
      makeInstance({ taskId: 'daily_drainage_check', status: 'active', progress: 1, targetValue: 2 }),
    ];
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', tasks);

    expect(dialog.lines.some((l) => l.includes('1/2'))).toBe(true);
    const closeOptions = dialog.options.filter((o) => o.action === 'close');
    expect(closeOptions).toHaveLength(1);
  });

  it('shows completed status', () => {
    const tasks = [
      makeInstance({ taskId: 'daily_drainage_check', status: 'completed', progress: 2, targetValue: 2 }),
    ];
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', tasks);

    expect(dialog.lines.some((l) => l.includes('已完成'))).toBe(true);
    const closeOptions = dialog.options.filter((o) => o.action === 'close');
    expect(closeOptions).toHaveLength(1);
  });

  it('shows all completed message', () => {
    const tasks = [
      makeInstance({ taskId: 'daily_drainage_check', status: 'completed', progress: 2, targetValue: 2 }),
      makeInstance({ instanceId: 'inst-2', taskId: 'daily_storm_waste', status: 'completed', progress: 3, targetValue: 3 }),
    ];
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', tasks);

    expect(dialog.lines.some((l) => l.includes('都已完成'))).toBe(true);
  });

  it('handles empty task list', () => {
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', []);
    expect(dialog.lines[0]).toContain('没有分配');
  });

  it('includes weather condition info for available tasks', () => {
    const tasks = [
      makeInstance({ taskId: 'daily_drainage_check', status: 'available' }),
    ];
    const dialog = resolveDailyTaskDialog('巡查员', '环境巡查员', 'npc_weather_ranger', tasks);
    expect(dialog.lines.some((l) => l.includes('需'))).toBe(true);
  });
});
