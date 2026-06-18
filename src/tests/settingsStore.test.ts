import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_AUDIO_SETTINGS } from '@/services/audio/AudioSettings';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  it('initializes with default audio settings', () => {
    const state = useSettingsStore.getState();
    expect(state.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
    expect(state.musicVolume).toBe(DEFAULT_AUDIO_SETTINGS.musicVolume);
    expect(state.sfxVolume).toBe(DEFAULT_AUDIO_SETTINGS.sfxVolume);
    expect(state.voiceVolume).toBe(DEFAULT_AUDIO_SETTINGS.voiceVolume);
    expect(state.muted).toBe(DEFAULT_AUDIO_SETTINGS.muted);
  });

  it('sets master volume', () => {
    useSettingsStore.getState().setMasterVolume(0.5);
    expect(useSettingsStore.getState().masterVolume).toBe(0.5);
  });

  it('sets music volume', () => {
    useSettingsStore.getState().setMusicVolume(0.3);
    expect(useSettingsStore.getState().musicVolume).toBe(0.3);
  });

  it('sets sfx volume', () => {
    useSettingsStore.getState().setSfxVolume(0.7);
    expect(useSettingsStore.getState().sfxVolume).toBe(0.7);
  });

  it('sets voice volume', () => {
    useSettingsStore.getState().setVoiceVolume(0.9);
    expect(useSettingsStore.getState().voiceVolume).toBe(0.9);
  });

  it('toggles mute', () => {
    useSettingsStore.getState().setMuted(true);
    expect(useSettingsStore.getState().muted).toBe(true);
    useSettingsStore.getState().setMuted(false);
    expect(useSettingsStore.getState().muted).toBe(false);
  });

  it('resets settings to defaults', () => {
    useSettingsStore.getState().setMasterVolume(0.1);
    useSettingsStore.getState().setMuted(true);
    useSettingsStore.getState().resetSettings();
    const state = useSettingsStore.getState();
    expect(state.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
    expect(state.muted).toBe(DEFAULT_AUDIO_SETTINGS.muted);
  });

  it('initializes with realtime time mode', () => {
    const state = useSettingsStore.getState();
    expect(state.timeMode).toBe('realtime');
    expect(state.demoTimePreset).toBeNull();
  });

  it('sets time mode to demo with preset', () => {
    useSettingsStore.getState().setTimeMode('demo', 'night');
    const state = useSettingsStore.getState();
    expect(state.timeMode).toBe('demo');
    expect(state.demoTimePreset).toBe('night');
  });

  it('sets time mode back to realtime', () => {
    useSettingsStore.getState().setTimeMode('demo', 'dawn');
    useSettingsStore.getState().setTimeMode('realtime', null);
    const state = useSettingsStore.getState();
    expect(state.timeMode).toBe('realtime');
    expect(state.demoTimePreset).toBeNull();
  });

  it('resets time mode to defaults', () => {
    useSettingsStore.getState().setTimeMode('demo', 'dusk');
    useSettingsStore.getState().resetSettings();
    const state = useSettingsStore.getState();
    expect(state.timeMode).toBe('realtime');
    expect(state.demoTimePreset).toBeNull();
  });
});
