import { create } from 'zustand';
import type { AudioSettingsState } from '@/services/audio/AudioSettings';
import { DEFAULT_AUDIO_SETTINGS } from '@/services/audio/AudioSettings';

interface SettingsState extends AudioSettingsState {
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setVoiceVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_AUDIO_SETTINGS,
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  setMusicVolume: (musicVolume) => set({ musicVolume }),
  setSfxVolume: (sfxVolume) => set({ sfxVolume }),
  setVoiceVolume: (voiceVolume) => set({ voiceVolume }),
  setMuted: (muted) => set({ muted }),
  resetSettings: () => set({ ...DEFAULT_AUDIO_SETTINGS }),
}));
