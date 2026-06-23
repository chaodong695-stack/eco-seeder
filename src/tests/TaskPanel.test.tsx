import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskPanel } from '@/ui/components/TaskPanel';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from "@/store/environmentStore";
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';

// Mock worldStore
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
      getDisplayWeather: () => 'clear' as const,
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

// Mock gameBridge
vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}));

describe('TaskPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useEnvironmentStore.getState().resetEnvironment();
    useUIStore.getState().returnToStart();
    useUIStore.getState().setTaskPanelOpen(true);
  });

  it('renders panel title', () => {
    useDailyTaskStore.getState().init();
    render(<TaskPanel />);
    expect(screen.getByText('任务面板')).toBeInTheDocument();
  });

  it('shows empty state when no active tasks', () => {
    useDailyTaskStore.getState().init();
    render(<TaskPanel />);
    expect(screen.getByText('暂无进行中的任务')).toBeInTheDocument();
  });

  it('shows task after accepting a daily task', () => {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks[0];
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    render(<TaskPanel />);
    const def = findDailyTaskById(task.taskId);
    expect(screen.getByText(def!.title)).toBeInTheDocument();
  });

  it('shows task description and progress', () => {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks[0];
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    render(<TaskPanel />);
    const def = findDailyTaskById(task.taskId);
    expect(screen.getByText(def!.description)).toBeInTheDocument();
    expect(screen.getByText(`进度：0/${def!.targetValue}`)).toBeInTheDocument();
  });

  it('shows completion hint', () => {
    useDailyTaskStore.getState().init();
    // Find an unconditional task
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    if (!task) return;
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    render(<TaskPanel />);
    const def = findDailyTaskById(task.taskId);
    const hints: Record<string, string> = {
      collect_waste: '靠近污染物堆，按住 E 清理',
      restore_area: '靠近受损环境点，按 E 修复',
    };
    if (hints[def!.objectiveType]) {
      expect(screen.getByText(`完成方式：${hints[def!.objectiveType]}`)).toBeInTheDocument();
    }
  });

  it('shows reward info', () => {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks[0];
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    render(<TaskPanel />);
    const def = findDailyTaskById(task.taskId);
    if (def?.reward?.restorationValue !== undefined) {
      expect(screen.getByText(`奖励：恢复值 +${def.reward.restorationValue}`)).toBeInTheDocument();
    }
  });

  it('shows completed status after task is completed', () => {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def && !def.condition?.supportedWeather;
    });
    if (!task) return;
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    const def = findDailyTaskById(task.taskId)!;
    for (let i = 0; i < def.targetValue; i++) {
      useDailyTaskStore.getState().applyProgress({
        objectiveType: def.objectiveType,
        amount: 1,
        sourceId: `src-${i}`,
      });
    }

    render(<TaskPanel />);
    expect(screen.getAllByText(/已完成/).length).toBeGreaterThan(0);
    expect(screen.getByText('已完成，奖励已发放')).toBeInTheDocument();
  });

  it('closes on close button click', () => {
    useDailyTaskStore.getState().init();
    render(<TaskPanel />);
    fireEvent.click(screen.getByText('✕'));
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
  });

  it('closes on overlay click', () => {
    useDailyTaskStore.getState().init();
    const { container } = render(<TaskPanel />);
    const overlay = container.querySelector('[class*="overlay"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
  });

  it('preserves task state after closing panel', () => {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks[0];
    useDailyTaskStore.getState().acceptTask(task.instanceId);

    render(<TaskPanel />);
    fireEvent.click(screen.getByText('✕'));

    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
    const storedTask = useDailyTaskStore.getState().tasks.find(
      (t) => t.instanceId === task.instanceId,
    );
    expect(storedTask?.status).not.toBe('available');
  });
});
