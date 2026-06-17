import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@/ui/components/SettingsPanel';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';

describe('SettingsPanel', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
    useSettingsStore.getState().resetSettings();
    useUIStore.getState().setSettingsOpen(true);
  });

  it('renders panel title', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('renders all volume sliders', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('主音量')).toBeInTheDocument();
    expect(screen.getByText('音乐音量')).toBeInTheDocument();
    expect(screen.getByText('音效音量')).toBeInTheDocument();
    expect(screen.getByText('配音音量')).toBeInTheDocument();
  });

  it('closes on close button', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('✕'));
    expect(useUIStore.getState().isSettingsOpen).toBe(false);
  });

  it('toggles mute', () => {
    render(<SettingsPanel />);
    const toggle = screen.getByText('静音').parentElement!.querySelector('div[role="button"]')!;
    fireEvent.click(toggle);
    expect(useSettingsStore.getState().muted).toBe(true);
  });
});
