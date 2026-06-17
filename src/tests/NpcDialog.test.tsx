import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NpcDialog } from '@/ui/components/NpcDialog';
import { useUIStore } from '@/store/uiStore';

describe('NpcDialog', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
    useUIStore.getState().setNpcDialogOpen(true, 'npc.test');
  });

  it('renders NPC name', () => {
    render(<NpcDialog />);
    expect(screen.getByText('环境监测员')).toBeInTheDocument();
  });

  it('shows first dialog line', () => {
    render(<NpcDialog />);
    expect(screen.getByText('欢迎来到雾港旧工业区。')).toBeInTheDocument();
  });

  it('advances to next line on continue click', () => {
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('继续'));
    expect(
      screen.getByText('这里的生态状况不容乐观，我们需要你的帮助。'),
    ).toBeInTheDocument();
  });

  it('closes after last line', () => {
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('关闭'));
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
  });

  it('closes on close button', () => {
    render(<NpcDialog />);
    fireEvent.click(screen.getByText('✕'));
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
  });
});
