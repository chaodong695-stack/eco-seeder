import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartPage } from '@/ui/pages/StartPage';
import { useUIStore } from '@/store/uiStore';

describe('StartPage', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
  });

  it('renders title and start button', () => {
    render(<StartPage />);
    expect(screen.getByText('生态播种者')).toBeInTheDocument();
    expect(screen.getByText('开始修复')).toBeInTheDocument();
  });

  it('navigates to character-select on button click', () => {
    render(<StartPage />);
    const button = screen.getByText('开始修复');
    fireEvent.click(button);
    expect(useUIStore.getState().currentPage).toBe('character-select');
  });
});
