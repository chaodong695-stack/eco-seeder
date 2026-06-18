import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskPanel } from '@/ui/components/TaskPanel';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';

describe('TaskPanel', () => {
  beforeEach(() => {
    useTaskStore.getState().resetTasks();
    useUIStore.getState().returnToStart();
    useUIStore.getState().setTaskPanelOpen(true);
  });

  it('renders panel title', () => {
    render(<TaskPanel />);
    expect(screen.getByText('任务面板')).toBeInTheDocument();
  });

  it('shows empty state when no active tasks', () => {
    render(<TaskPanel />);
    expect(screen.getByText('暂无进行中的任务')).toBeInTheDocument();
  });

  it('shows task after accepting', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    render(<TaskPanel />);
    expect(screen.getByText('清理旧工业区污染物堆')).toBeInTheDocument();
    expect(screen.getByText('进行中')).toBeInTheDocument();
  });

  it('shows current objective text', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    render(<TaskPanel />);
    expect(
      screen.getByText('前往工业区东侧，检查并清理污染物堆'),
    ).toBeInTheDocument();
  });

  it('updates objective text after objective completed', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    useTaskStore
      .getState()
      .completeObjective(
        'task.urban_wasteland.pollution_cleanup_01',
        'interaction.pollution_zone_01',
      );
    render(<TaskPanel />);
    expect(screen.getByText('返回林工处提交任务')).toBeInTheDocument();
    expect(screen.getByText('目标已完成')).toBeInTheDocument();
  });

  it('shows completed status after submission', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    useTaskStore
      .getState()
      .completeObjective(
        'task.urban_wasteland.pollution_cleanup_01',
        'interaction.pollution_zone_01',
      );
    useTaskStore
      .getState()
      .submitTask('task.urban_wasteland.pollution_cleanup_01', 'npc.engineer.lin');
    render(<TaskPanel />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('已领取')).toBeInTheDocument();
  });

  it('shows reward preview', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    render(<TaskPanel />);
    expect(screen.getByText(/生态点数 10/)).toBeInTheDocument();
    expect(screen.getByText(/声望 5/)).toBeInTheDocument();
  });

  it('closes on close button click', () => {
    render(<TaskPanel />);
    fireEvent.click(screen.getByText('✕'));
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
  });

  it('closes on overlay click', () => {
    const { container } = render(<TaskPanel />);
    const overlay = container.querySelector('[class*="overlay"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
  });

  it('preserves task state after closing panel', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    render(<TaskPanel />);
    fireEvent.click(screen.getByText('✕'));
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
    expect(
      useTaskStore.getState().getTaskStatus('task.urban_wasteland.pollution_cleanup_01'),
    ).toBe('active');
  });
});
