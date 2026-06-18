import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@/ui/components/SettingsPanel';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorldStore } from '@/store/worldStore';
import { destroyTimeService } from '@/domain/time/worldTimeService';

describe('SettingsPanel', () => {
  beforeEach(() => {
    destroyTimeService();
    useUIStore.getState().returnToStart();
    useSettingsStore.getState().resetSettings();
    useWorldStore.getState().resetWorld();
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

  it('renders demo time preset section', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('演示时间')).toBeInTheDocument();
    expect(screen.getByText('跟随现实时间')).toBeInTheDocument();
    expect(screen.getByText('清晨')).toBeInTheDocument();
    expect(screen.getByText('白天')).toBeInTheDocument();
    expect(screen.getByText('黄昏')).toBeInTheDocument();
    expect(screen.getByText('夜晚')).toBeInTheDocument();
  });

  it('defaults to realtime mode (follow reality)', () => {
    render(<SettingsPanel />);
    const realtimeBtn = screen.getByText('跟随现实时间');
    expect(realtimeBtn.className).toMatch(/Active/);
  });

  it('switches to dawn preset', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('清晨'));
    expect(useSettingsStore.getState().timeMode).toBe('demo');
    expect(useSettingsStore.getState().demoTimePreset).toBe('dawn');
  });

  it('switches to night preset', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('夜晚'));
    expect(useSettingsStore.getState().timeMode).toBe('demo');
    expect(useSettingsStore.getState().demoTimePreset).toBe('night');
  });

  it('switches back to realtime', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('夜晚'));
    expect(useSettingsStore.getState().timeMode).toBe('demo');
    fireEvent.click(screen.getByText('跟随现实时间'));
    expect(useSettingsStore.getState().timeMode).toBe('realtime');
    expect(useSettingsStore.getState().demoTimePreset).toBeNull();
  });

  it('does not produce input mode conflict', () => {
    render(<SettingsPanel />);
    // Settings panel is open with settings mode
    expect(useUIStore.getState().inputMode).toBe('settings');
    // Switching time preset should not change input mode
    fireEvent.click(screen.getByText('黄昏'));
    expect(useUIStore.getState().inputMode).toBe('settings');
  });

  // ─── DEV 天气预览测试 ──────────────────────────────

  it('renders dev weather preview section in DEV mode', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('天气预览（开发）')).toBeInTheDocument();
    expect(screen.getByText('晴朗')).toBeInTheDocument();
    expect(screen.getByText('阴天')).toBeInTheDocument();
    expect(screen.getByText('小雨')).toBeInTheDocument();
    expect(screen.getByText('暴雨')).toBeInTheDocument();
    expect(screen.getByText('雾')).toBeInTheDocument();
  });

  it('sets dev weather preview when clicking a weather button', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('雾'));
    expect(useWorldStore.getState().devWeatherPreview).toBe('fog');
  });

  it('exits dev weather preview when clicking the same weather again', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('晴朗'));
    expect(useWorldStore.getState().devWeatherPreview).toBe('clear');
    fireEvent.click(screen.getByText('晴朗'));
    expect(useWorldStore.getState().devWeatherPreview).toBeNull();
  });

  it('shows exit preview button when preview is active', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('暴雨'));
    expect(screen.getByText('退出预览')).toBeInTheDocument();
  });

  it('exit preview button clears dev weather preview', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('小雨'));
    expect(useWorldStore.getState().devWeatherPreview).toBe('light_rain');
    fireEvent.click(screen.getByText('退出预览'));
    expect(useWorldStore.getState().devWeatherPreview).toBeNull();
  });

  it('switching weather preview does not affect formal timeline', () => {
    useWorldStore.getState().init('realtime');
    const timelineBefore = useWorldStore.getState().getWeatherTimeline();
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('雾'));
    fireEvent.click(screen.getByText('晴朗'));
    fireEvent.click(screen.getByText('退出预览'));
    const timelineAfter = useWorldStore.getState().getWeatherTimeline();
    expect(timelineAfter).toBe(timelineBefore);
  });

  it('weather preview does not produce input mode conflict', () => {
    render(<SettingsPanel />);
    expect(useUIStore.getState().inputMode).toBe('settings');
    fireEvent.click(screen.getByText('暴雨'));
    expect(useUIStore.getState().inputMode).toBe('settings');
  });
});
