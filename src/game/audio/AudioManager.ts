/**
 * 音频管理器 — DEV-06 音效系统接入。
 *
 * 功能：
 * - playBgm / stopBgm：背景音乐播放与停止
 * - playSfx：播放一次性音效
 * - setMuted / isMuted：静音控制
 * - 处理浏览器自动播放限制（延迟到用户交互后生效）
 * - 音频文件不存在时静默降级，不产生控制台错误刷屏
 * - 不在页面加载时自动播放 BGM
 *
 * 当前音频文件尚未上传，所有播放操作会静默降级。
 * 人工补充音频文件后无需修改代码即可生效。
 */

import { audioAssets } from '@/game/assets/assetManifest';

/** 音频降级标志集合 — 记录已失败的音频 src，避免重复尝试和刷屏。 */
const failedSrcSet = new Set<string>();

/** 单例实例。 */
let instance: AudioManagerImpl | null = null;

export interface AudioManager {
  playBgm(src: string): void;
  stopBgm(): void;
  playSfx(key: string, src: string): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** 销毁实例，停止所有播放。 */
  destroy(): void;
}

class AudioManagerImpl implements AudioManager {
  private muted = false;
  private currentBgmAudio: HTMLAudioElement | null = null;
  private currentBgmSrc: string | null = null;

  constructor() {
    // 浏览器自动播放限制 — 等待首次用户交互后标记可用
    const unlock = () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      // 静音 BGM
      if (this.currentBgmAudio) {
        this.currentBgmAudio.pause();
      }
    } else {
      // 取消静音 — 如果有 BGM 在播放，恢复
      if (this.currentBgmAudio && this.currentBgmSrc) {
        this.currentBgmAudio.play().catch(() => {
          // 静默处理
        });
      }
    }
  }

  playBgm(src: string): void {
    // 静音状态不播放
    if (this.muted) return;

    // 如果已经在播放同一首 BGM，不重复播放
    if (this.currentBgmSrc === src && this.currentBgmAudio) return;

    // 已知失败的 src 不再尝试
    if (failedSrcSet.has(src)) return;

    // 停止当前 BGM
    this.stopBgm();

    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0.5;

      audio.addEventListener('error', () => {
        // 音频文件不存在 — 静默降级，记录失败 src 避免重复尝试
        failedSrcSet.add(src);
        this.currentBgmAudio = null;
        this.currentBgmSrc = null;
      });

      audio.play().catch(() => {
        // 浏览器自动播放限制 — 标记待播放
        // 用户交互后会通过 unlock 恢复，此处静默处理
      });

      this.currentBgmAudio = audio;
      this.currentBgmSrc = src;
    } catch {
      // 创建 Audio 对象失败 — 静默降级
      failedSrcSet.add(src);
    }
  }

  stopBgm(): void {
    if (this.currentBgmAudio) {
      try {
        this.currentBgmAudio.pause();
        this.currentBgmAudio.currentTime = 0;
      } catch {
        // 静默处理
      }
      this.currentBgmAudio = null;
      this.currentBgmSrc = null;
    }
  }

  playSfx(_key: string, src: string): void {
    // 静音状态不播放
    if (this.muted) return;

    // 已知失败的 src 不再尝试
    if (failedSrcSet.has(src)) return;

    try {
      const audio = new Audio(src);
      audio.volume = 0.7;

      audio.addEventListener('error', () => {
        // 音效文件不存在 — 静默降级
        failedSrcSet.add(src);
      });

      audio.play().catch(() => {
        // 自动播放限制或文件不存在 — 静默处理
      });
    } catch {
      // 静默降级
      failedSrcSet.add(src);
    }
  }

  destroy(): void {
    this.stopBgm();
  }
}

/** 获取 AudioManager 单例。 */
export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManagerImpl();
  }
  return instance;
}

/**
 * 便捷方法 — 使用 assetManifest 中定义的 src 播放 BGM。
 */
export function playBgmByKey(key: keyof typeof audioAssets.bgm): void {
  const src = audioAssets.bgm[key];
  if (src) {
    getAudioManager().playBgm(src);
  }
}

/**
 * 便捷方法 — 使用 assetManifest 中定义的 src 播放 SFX。
 */
export function playSfxByKey(key: keyof typeof audioAssets.sfx): void {
  const src = audioAssets.sfx[key];
  if (src) {
    getAudioManager().playSfx(key, src);
  }
}
