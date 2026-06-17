/**
 * 音频设置状态接口。
 *
 * 依据 13_AUDIO_AND_VOICE_DESIGN.md 和 04_TECHNICAL_ARCHITECTURE.md。
 * 本阶段不提交正式音频，不自动播放背景音乐，不调用远程音频服务。
 */
export interface AudioSettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsState = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  voiceVolume: 0.8,
  muted: false,
};
