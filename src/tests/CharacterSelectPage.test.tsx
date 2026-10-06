import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterSelectPage } from '@/ui/pages/CharacterSelectPage';
import { useUIStore } from '@/store/uiStore';
import { usePlayerStore } from '@/store/playerStore';
import { useGovernanceStore } from '@/store/governanceStore';

describe('CharacterSelectPage', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
    usePlayerStore.getState().resetCharacter();
  });

  it('renders title and character options', () => {
    render(<CharacterSelectPage />);
    expect(screen.getByText('选择生态修复员')).toBeInTheDocument();
    expect(screen.getByText('男性修复员')).toBeInTheDocument();
    expect(screen.getByText('女性修复员')).toBeInTheDocument();
  });

  it('disables confirm button before selection', () => {
    render(<CharacterSelectPage />);
    const confirmBtn = screen.getByText('进入主场景');
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button after selecting male', () => {
    render(<CharacterSelectPage />);
    fireEvent.click(screen.getByText('男性修复员'));
    expect(screen.getByText('进入主场景')).not.toBeDisabled();
  });

  it('enables confirm button after selecting female', () => {
    render(<CharacterSelectPage />);
    fireEvent.click(screen.getByText('女性修复员'));
    expect(screen.getByText('进入主场景')).not.toBeDisabled();
  });

  it('navigates to game and selects character on confirm', () => {
    render(<CharacterSelectPage />);
    fireEvent.click(screen.getByText('女性修复员'));
    fireEvent.click(screen.getByText('进入主场景'));
    expect(useUIStore.getState().currentPage).toBe('game');
    expect(usePlayerStore.getState().character?.gender).toBe('female');
  });

  it('returns to start page on back button', () => {
    useUIStore.getState().setPage('character-select');
    render(<CharacterSelectPage />);
    fireEvent.click(screen.getByText('返回'));
    expect(useUIStore.getState().currentPage).toBe('start');
  });

  it('starts a fresh mission when a new character selection is confirmed', () => {
    useGovernanceStore.getState().beginSession('male');
    useGovernanceStore.getState().acceptMission();
    render(<CharacterSelectPage />);
    fireEvent.click(screen.getByText('女性修复员'));
    fireEvent.click(screen.getByText('进入主场景'));
    expect(useGovernanceStore.getState().stage).toBe('briefing');
    expect(useGovernanceStore.getState().characterGender).toBe('female');
    expect(useGovernanceStore.getState().completedPointIds).toEqual([]);
  });
});
