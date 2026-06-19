import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameHud } from '@/ui/components/GameHud';
import { useUIStore } from '@/store/uiStore';

describe('GameHud', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
    useUIStore.getState().setPage('game');
  });

  it('renders map name in top bar', () => {
    render(<GameHud onReturnToStart={() => {}} />);
    expect(screen.getByText('雾港旧工业区')).toBeInTheDocument();
  });

  it('opens task panel on task button click', () => {
    render(<GameHud onReturnToStart={() => {}} />);
    fireEvent.click(screen.getByText(/任务/));
    expect(useUIStore.getState().isTaskPanelOpen).toBe(true);
  });

  it('opens settings panel on settings icon button click', () => {
    render(<GameHud onReturnToStart={() => {}} />);
    fireEvent.click(screen.getByTitle('设置'));
    expect(useUIStore.getState().isSettingsOpen).toBe(true);
  });

  it('opens settings panel on settings button click', () => {
    render(<GameHud onReturnToStart={() => {}} />);
    // Bottom bar settings button contains emoji + text
    const settingsButtons = screen.getAllByText(/设置/);
    fireEvent.click(settingsButtons[settingsButtons.length - 1]);
    expect(useUIStore.getState().isSettingsOpen).toBe(true);
  });

  it('calls onReturnToStart when return button clicked', () => {
    let called = false;
    render(<GameHud onReturnToStart={() => { called = true; }} />);
    fireEvent.click(screen.getByText(/返回开始/));
    expect(called).toBe(true);
  });
});
