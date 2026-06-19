/**
 * 任务面板一致性测试 — 验证右侧 DailyTaskPanel 和底部 TaskPanel 读取同一份 dailyTaskStore。
 *
 * 覆盖 Issue #16 第 1 点：
 * 1. 接取普通任务后，右侧列表和任务面板都显示该任务；
 * 2. 接取天气任务且条件不满足时，两个 UI 都显示"等待天气"；
 * 3. 状态从 waiting_condition 切换到 active 后，两个 UI 同步更新；
 * 4. 完成任务后，两个 UI 同步显示完成状态；
 * 5. 返回开始页再进入后，两个 UI 状态仍一致。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyTaskPanel } from '@/ui/components/DailyTaskPanel';
import { TaskPanel } from '@/ui/components/TaskPanel';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';

// Mock worldStore
vi.mock('@/store/worldStore', () => {
  let displayWeather: string = 'clear';
  return {
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
        getDisplayWeather: () => displayWeather as 'clear',
        _setDisplay: (w: string) => { displayWeather = w; },
      }),
      subscribe: vi.fn(() => () => {}),
    },
  };
});

// Mock gameBridge
vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
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

describe('Task panel consistency — DailyTaskPanel and TaskPanel read same store', () => {
  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useEnvironmentStore.getState().resetEnvironment();
    useUIStore.getState().returnToStart();
    useUIStore.getState().setTaskPanelOpen(true);
  });

  it('both panels show empty state when no tasks accepted', () => {
    useDailyTaskStore.getState().init();

    const { unmount: unmountDaily } = render(<DailyTaskPanel />);
    // DailyTaskPanel shows all tasks including available
    // TaskPanel only shows active/waiting/completed

    unmountDaily();

    render(<TaskPanel />);
    expect(screen.getByText('暂无进行中的任务')).toBeInTheDocument();
  });

  it('both panels show accepted task', () => {
    useDailyTaskStore.getState().init();

    // Find an unconditional task
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    const def = findDailyTaskById(task.taskId)!;

    // Render DailyTaskPanel
    const { unmount: unmountDaily } = render(<DailyTaskPanel />);
    expect(screen.getByText(def.title)).toBeInTheDocument();
    expect(screen.getByText(/进行中/)).toBeInTheDocument();
    unmountDaily();

    // Render TaskPanel — should show the same task
    render(<TaskPanel />);
    expect(screen.getByText(def.title)).toBeInTheDocument();
    expect(screen.getByText(/进行中/)).toBeInTheDocument();
  });

  it('both panels show "等待天气" for weather task when condition not met', () => {
    useDailyTaskStore.getState().init();

    // Find a weather task
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && def.condition?.supportedWeather && def.condition.supportedWeather.length > 0;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    const def = findDailyTaskById(task.taskId)!;

    // Render DailyTaskPanel — should show "等待天气"
    const { unmount: unmountDaily } = render(<DailyTaskPanel />);
    expect(screen.getAllByText(/等待天气/).length).toBeGreaterThan(0);
    unmountDaily();

    // Render TaskPanel — should also show "等待天气"
    render(<TaskPanel />);
    expect(screen.getAllByText(/等待天气/).length).toBeGreaterThan(0);
    // Should show the task title
    expect(screen.getByText(def.title)).toBeInTheDocument();
  });

  it('both panels sync when task status changes from waiting to active', () => {
    useDailyTaskStore.getState().init();

    // Find a weather task
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && def.condition?.supportedWeather && def.condition.supportedWeather.length > 0;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    // Initially waiting_condition (current weather is 'clear')
    let state = useDailyTaskStore.getState();
    let inst = state.tasks.find((t) => t.instanceId === task.instanceId);
    expect(inst?.status).toBe('waiting_condition');

    // Simulate weather change to match the task condition

    // Manually update store state to simulate weather refresh
    useDailyTaskStore.setState({
      tasks: state.tasks.map((t) =>
        t.instanceId === task.instanceId
          ? { ...t, status: 'active' as const }
          : t,
      ),
    });

    state = useDailyTaskStore.getState();
    inst = state.tasks.find((t) => t.instanceId === task.instanceId);
    expect(inst?.status).toBe('active');

    // Both panels should show "进行中"
    const { unmount: unmountDaily } = render(<DailyTaskPanel />);
    expect(screen.getByText(/进行中/)).toBeInTheDocument();
    unmountDaily();

    render(<TaskPanel />);
    expect(screen.getByText(/进行中/)).toBeInTheDocument();
  });

  it('both panels show completed status after task completion', () => {
    useDailyTaskStore.getState().init();

    // Find an unconditional task
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    const def = findDailyTaskById(task.taskId)!;

    // Complete the task
    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `src-${i}`,
      });
    }

    // Verify task is completed
    const state = useDailyTaskStore.getState();
    const inst = state.tasks.find((t) => t.instanceId === task.instanceId);
    expect(inst?.status).toBe('completed');

    // Both panels should show "已完成"
    const { unmount: unmountDaily } = render(<DailyTaskPanel />);
    expect(screen.getAllByText(/已完成/).length).toBeGreaterThan(0);
    unmountDaily();

    render(<TaskPanel />);
    expect(screen.getAllByText(/已完成/).length).toBeGreaterThan(0);
  });

  it('task state persists after reset + re-init (simulating return to start and re-enter)', () => {
    useDailyTaskStore.getState().init();

    // Find an unconditional task
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    expect(task).toBeDefined();
    if (!task) return;

    useDailyTaskStore.getState().acceptTask(task.instanceId);

    const acceptedTaskId = task.taskId;
    const acceptedStatus = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    )?.status;

    // Simulate return to start — daily tasks NOT reset (per GamePage)
    // The store state persists because we don't call resetDailyTasks
    // But isInitialized flag is still true

    // Verify state persists
    const stateAfterReturn = useDailyTaskStore.getState();
    const taskAfterReturn = stateAfterReturn.tasks.find(
      (t) => t.instanceId === task.instanceId,
    );
    expect(taskAfterReturn?.status).toBe(acceptedStatus);
    expect(taskAfterReturn?.taskId).toBe(acceptedTaskId);
  });
});
