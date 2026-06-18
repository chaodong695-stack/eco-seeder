import { create } from 'zustand';
import type { AudioSettingsState } from '@/services/audio/AudioSettings';
import { DEFAULT_AUDIO_SETTINGS } from '@/services/audio/AudioSettings';
import type { DemoTimePreset, TimeMode } from '@/domain/time/timeTypes';

interface SettingsState extends AudioSettingsState {
  /** 时间模式。 */
  timeMode: TimeMode;
  /** 演示时间预设。 */
  demoTimePreset: DemoTimePreset | null;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setVoiceVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setTimeMode: (mode: TimeMode, preset?: DemoTimePreset | null) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_AUDIO_SETTINGS,
  timeMode: 'realtime',
  demoTimePreset: null,
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  setMusicVolume: (musicVolume) => set({ musicVolume }),
  setSfxVolume: (sfxVolume) => set({ sfxVolume }),
  setVoiceVolume: (voiceVolume) => set({ voiceVolume }),
  setMuted: (muted) => set({ muted }),
  setTimeMode: (mode, preset = null) => set({ timeMode: mode, demoTimePreset: preset }),
  resetSettings: () => set({ ...DEFAULT_AUDIO_SETTINGS, timeMode: 'realtime', demoTimePreset: null }),
}));
