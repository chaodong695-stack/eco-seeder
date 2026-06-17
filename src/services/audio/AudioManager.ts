import type { AudioManifest } from '@/types';
import type { AudioSettingsState } from './AudioSettings';
import { audioManifest } from './audioManifest';

/**
 * 音频管理器接口。
 *
 * 本阶段为骨架，不自动播放背景音乐，不调用远程音频服务。
 * 使用 Howler.js 管理，但仅提供接口骨架。
 */
export interface AudioManager {
  loadManifest(manifest: AudioManifest): void;
  play(id: string): void;
  stop(id: string): void;
  setVolume(settings: AudioSettingsState): void;
  mute(): void;
  unmute(): void;
}

/**
 * 占位音频管理器。
 * 本阶段不实际播放音频，只记录调用日志。
 */
export class PlaceholderAudioManager implements AudioManager {
  private manifest: AudioManifest = audioManifest;

  loadManifest(manifest: AudioManifest): void {
    this.manifest = manifest;
  }

  play(id: string): void {
    const entry = this.manifest.entries.find((e) => e.id === id);
    if (entry) {
      console.warn(`[AudioManager] placeholder play: ${id} -> ${entry.path}`);
    }
  }

  stop(_id: string): void {
    // placeholder
  }

  setVolume(_settings: AudioSettingsState): void {
    // placeholder
  }

  mute(): void {
    // placeholder
  }

  unmute(): void {
    // placeholder
  }
}
