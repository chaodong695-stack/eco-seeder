/**
 * 统一音频管理器 — DEV-08 音频播放系统。
 *
 * 功能：
 * - playBgm / stopBgm / switchBgm：BGM 播放、停止、切换
 * - playSfx：播放一次性音效
 * - setMuted / isMuted：全局静音控制
 * - setBgmVolume / setSfxVolume：音量控制
 * - 处理浏览器自动播放限制（首次用户交互后解锁）
 * - 音频文件不存在时静默降级，不产生控制台错误刷屏
 * - 避免同一个 BGM 重复叠加
 * - 记录当前场景，取消静音后恢复对应 BGM
 */

import { AUDIO_ASSETS } from './audioConfig';

/** 音频降级标志集合 — 记录已失败的音频 src，避免重复尝试和刷屏。 */
const failedSrcSet = new Set<string>();

/** BGM key 类型。 */
type BgmKey = keyof typeof AUDIO_ASSETS.bgm;

/** SFX key 类型。 */
type SfxKey = keyof typeof AUDIO_ASSETS.sfx;

/** BGM 默认音量 — 较低，作为背景氛围。 */
const DEFAULT_BGM_VOLUME = 0.3;

/** SFX 默认音量。 */
const DEFAULT_SFX_VOLUME = 0.6;

/** NPC 随机任务音效音量 — 更低，避免打断玩家。 */
const NPC_SFX_VOLUME = 0.4;

export interface AudioManager {
  /** 播放指定 BGM（自动停止之前的 BGM，避免叠加）。 */
  playBgm(key: BgmKey): void;
  /** 停止当前 BGM。 */
  stopBgm(): void;
  /** 切换 BGM（等价于 playBgm，语义更清晰）。 */
  switchBgm(key: BgmKey): void;
  /** 播放一次性音效。 */
  playSfx(key: SfxKey): void;
  /** 设置静音状态。 */
  setMuted(muted: boolean): void;
  /** 获取当前静音状态。 */
  isMuted(): boolean;
  /** 设置 BGM 音量（0-1）。 */
  setBgmVolume(volume: number): void;
  /** 设置 SFX 音量（0-1）。 */
  setSfxVolume(volume: number): void;
  /** 设置当前场景标识（用于取消静音后恢复对应 BGM）。 */
  setScene(scene: 'start' | 'game' | null): void;
  /** 用户首次交互后解锁音频播放。 */
  unlock(): void;
  /** 销毁实例，停止所有播放。 */
  destroy(): void;
}

class AudioManagerImpl implements AudioManager {
  private muted = false;
  private currentBgmAudio: HTMLAudioElement | null = null;
  private currentBgmKey: BgmKey | null = null;
  private bgmVolume = DEFAULT_BGM_VOLUME;
  private sfxVolume = DEFAULT_SFX_VOLUME;
  /** 当前场景标识 — 取消静音后恢复对应 BGM。 */
  private currentScene: 'start' | 'game' | null = null;
  /** 音频是否已解锁（用户已交互）。 */
  private unlocked = false;
  /** 解锁监听是否已注册。 */
  private unlockListenersRegistered = false;

  constructor() {
    this.registerUnlockListeners();
  }

  /**
   * 注册首次交互解锁监听。
   *
   * 浏览器自动播放限制要求用户先与页面交互才能播放音频。
   * 在用户首次 click / keydown / touchstart 后标记解锁，
   * 并尝试恢复当前场景对应的 BGM。
   */
  private registerUnlockListeners(): void {
    if (this.unlockListenersRegistered) return;
    this.unlockListenersRegistered = true;

    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;

      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);

      // 解锁后尝试恢复当前场景的 BGM
      this.restoreBgmForCurrentScene();
    };

    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);
  }

  /**
   * 手动解锁 — 用户点击音频按钮、开始游戏等交互后调用。
   */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.restoreBgmForCurrentScene();
  }

  /**
   * 根据当前场景恢复对应 BGM。
   */
  private restoreBgmForCurrentScene(): void {
    if (this.muted) return;
    if (this.currentScene === 'start') {
      this.playBgm('startPage');
    } else if (this.currentScene === 'game') {
      this.playBgm('wasteland');
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      // 静音 — 暂停 BGM
      if (this.currentBgmAudio) {
        this.currentBgmAudio.pause();
      }
    } else {
      // 取消静音 — 恢复当前场景对应的 BGM
      this.restoreBgmForCurrentScene();
    }
  }

  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.currentBgmAudio) {
      this.currentBgmAudio.volume = this.bgmVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setScene(scene: 'start' | 'game' | null): void {
    this.currentScene = scene;
  }

  playBgm(key: BgmKey): void {
    const src = AUDIO_ASSETS.bgm[key];

    // 静音状态不播放
    if (this.muted) {
      // 但记录当前 BGM key，取消静音后恢复
      this.currentBgmKey = key;
      return;
    }

    // 如果已经在播放同一首 BGM，不重复播放
    if (this.currentBgmKey === key && this.currentBgmAudio) {
      // 确保正在播放
      if (this.currentBgmAudio.paused) {
        this.currentBgmAudio.play().catch(() => {});
      }
      return;
    }

    // 已知失败的 src 不再尝试
    if (failedSrcSet.has(src)) {
      this.currentBgmKey = key;
      return;
    }

    // 停止当前 BGM
    this.stopBgmInternal();

    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.bgmVolume;

      audio.addEventListener('error', () => {
        // 音频文件不存在 — 静默降级，记录失败 src 避免重复尝试
        failedSrcSet.add(src);
        if (this.currentBgmAudio === audio) {
          this.currentBgmAudio = null;
          this.currentBgmKey = null;
        }
      });

      audio.play().catch(() => {
        // 浏览器自动播放限制 — 等待用户交互后通过 unlock 恢复
        // 此处静默处理，不抛出异常
      });

      this.currentBgmAudio = audio;
      this.currentBgmKey = key;
    } catch {
      // 创建 Audio 对象失败 — 静默降级
      failedSrcSet.add(src);
    }
  }

  switchBgm(key: BgmKey): void {
    this.playBgm(key);
  }

  stopBgm(): void {
    this.stopBgmInternal();
    this.currentBgmKey = null;
  }

  private stopBgmInternal(): void {
    if (this.currentBgmAudio) {
      try {
        this.currentBgmAudio.pause();
        this.currentBgmAudio.currentTime = 0;
      } catch {
        // 静默处理
      }
      this.currentBgmAudio = null;
    }
  }

  playSfx(key: SfxKey): void {
    // 静音状态不播放
    if (this.muted) return;

    const src = AUDIO_ASSETS.sfx[key];

    // 已知失败的 src 不再尝试
    if (failedSrcSet.has(src)) return;

    try {
      const audio = new Audio(src);
      // NPC 随机任务音效使用更低音量
      audio.volume = key === 'npcRandomTask' ? NPC_SFX_VOLUME : this.sfxVolume;

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
    this.currentBgmKey = null;
    this.currentScene = null;
  }
}

/** 单例实例。 */
let instance: AudioManagerImpl | null = null;

/** 获取 AudioManager 单例。 */
export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManagerImpl();
  }
  return instance;
}

/**
 * 便捷方法 — 播放指定 BGM。
 */
export function playBgmByKey(key: BgmKey): void {
  getAudioManager().playBgm(key);
}

/**
 * 便捷方法 — 播放指定 SFX。
 */
export function playSfxByKey(key: SfxKey): void {
  getAudioManager().playSfx(key);
}
