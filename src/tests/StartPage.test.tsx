import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartPage } from '@/ui/pages/StartPage';
import { useUIStore } from '@/store/uiStore';
import { useGovernanceStore } from '@/store/governanceStore';
import { usePlayerStore } from '@/store/playerStore';

describe('StartPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useGovernanceStore.getState().reset();
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

  it('continues the saved mission with its character and progress', () => {
    useGovernanceStore.getState().beginSession('female');
    useGovernanceStore.getState().acceptMission();
    render(<StartPage />);
    fireEvent.click(screen.getByText('继续游戏'));
    expect(useUIStore.getState().currentPage).toBe('game');
    expect(usePlayerStore.getState().character?.gender).toBe('female');
    expect(useGovernanceStore.getState().stage).toBe('monitoring');
  });

  it('requires explicit confirmation before selecting a new game and permits cancellation', () => {
    useGovernanceStore.getState().beginSession('male');
    useGovernanceStore.getState().acceptMission();
    render(<StartPage />);
    fireEvent.click(screen.getByText('开始新游戏'));
    expect(screen.getByRole('dialog', { name: '确认新游戏' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('保留进度'));
    expect(useUIStore.getState().currentPage).toBe('start');
    expect(useGovernanceStore.getState().accepted).toBe(true);
    fireEvent.click(screen.getByText('开始新游戏'));
    fireEvent.click(screen.getByText('确认开始新游戏'));
    expect(useUIStore.getState().currentPage).toBe('character-select');
  });
});
