import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NpcDialog } from '@/ui/components/NpcDialog';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';

describe('NpcDialog', () => {
  beforeEach(() => {
    useTaskStore.getState().resetTasks();
    useUIStore.getState().returnToStart();
    useUIStore.getState().setNpcDialogOpen(true, 'npc.engineer.lin');
  });

  it('renders NPC name', () => {
    render(<NpcDialog />);
    expect(screen.getByText('林工')).toBeInTheDocument();
  });

  it('renders NPC role', () => {
    render(<NpcDialog />);
    expect(screen.getByText('生态修复工程师')).toBeInTheDocument();
  });

  it('shows available dialog text when task is available', () => {
    render(<NpcDialog />);
    expect(
      screen.getByText('旧工业区东侧还有一处污染物堆没有完成检查。'),
    ).toBeInTheDocument();
  });

  it('shows accept task option when task is available', () => {
    render(<NpcDialog />);
    expect(screen.getByText('接受任务')).toBeInTheDocument();
    expect(screen.getByText('暂时不去')).toBeInTheDocument();
  });

  it('triggers task acceptance on accept click', () => {
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('接受任务'));
    // 对话应关闭
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
    // 任务状态应变为 active
    expect(
      useTaskStore.getState().getTaskStatus('task.urban_wasteland.pollution_cleanup_01'),
    ).toBe('active');
  });

  it('shows active dialog after accepting task', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    render(<NpcDialog />);
    expect(screen.getByText('污染物堆就在工业区东侧。')).toBeInTheDocument();
    expect(screen.getByText('我知道了')).toBeInTheDocument();
    // 不再显示接受任务
    expect(screen.queryByText('接受任务')).not.toBeInTheDocument();
  });

  it('shows submit option when objective is completed', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    useTaskStore
      .getState()
      .completeObjective(
        'task.urban_wasteland.pollution_cleanup_01',
        'interaction.pollution_zone_01',
      );
    render(<NpcDialog />);
    expect(screen.getByText('你已经处理完那处污染物堆了吗？')).toBeInTheDocument();
    expect(screen.getByText('提交任务')).toBeInTheDocument();
  });

  it('triggers task submission on submit click', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    useTaskStore
      .getState()
      .completeObjective(
        'task.urban_wasteland.pollution_cleanup_01',
        'interaction.pollution_zone_01',
      );
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('提交任务'));
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
    expect(
      useTaskStore.getState().getTaskStatus('task.urban_wasteland.pollution_cleanup_01'),
    ).toBe('completed');
    expect(
      useTaskStore.getState().isRewardClaimed('task.urban_wasteland.pollution_cleanup_01'),
    ).toBe(true);
  });

  it('shows completed dialog after task is completed', () => {
    useTaskStore.getState().acceptTask('task.urban_wasteland.pollution_cleanup_01');
    useTaskStore
      .getState()
      .completeObjective(
        'task.urban_wasteland.pollution_cleanup_01',
        'interaction.pollution_zone_01',
      );
    useTaskStore.getState().submitTask('task.urban_wasteland.pollution_cleanup_01', 'npc.engineer.lin');
    render(<NpcDialog />);
    expect(
      screen.getByText('处理得不错。这里的污染扩散风险暂时降低了。'),
    ).toBeInTheDocument();
    expect(screen.getByText('结束对话')).toBeInTheDocument();
  });

  it('closes on close button', () => {
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('✕'));
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
  });

  it('closes on dismiss option', () => {
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('暂时不去'));
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
    // 任务仍应为 available
    expect(
      useTaskStore.getState().getTaskStatus('task.urban_wasteland.pollution_cleanup_01'),
    ).toBe('available');
  });
});
