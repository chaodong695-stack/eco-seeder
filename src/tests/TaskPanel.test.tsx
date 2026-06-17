import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskPanel } from '@/ui/components/TaskPanel';
import { useUIStore } from '@/store/uiStore';

describe('TaskPanel', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
    useUIStore.getState().setTaskPanelOpen(true);
  });

  it('renders panel title', () => {
    render(<TaskPanel />);
    expect(screen.getByText('任务面板')).toBeInTheDocument();
  });

  it('renders placeholder tasks', () => {
    render(<TaskPanel />);
    expect(screen.getByText('清理排水口')).toBeInTheDocument();
    expect(screen.getByText('分类清理废弃物')).toBeInTheDocument();
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
});
