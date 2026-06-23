import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getAudioManager, playBgmByKey } from '@/game/audio/audioManager';
import { imageAssets } from '@/game/assets/assetManifest';
import styles from './StartPage.module.css';

export function StartPage() {
  const setPage = useUIStore((s) => s.setPage);
  const muted = useSettingsStore((s) => s.muted);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const [mutedState, setMutedState] = useState(muted);

  // 进入开始页时设置场景并尝试播放 BGM
  useEffect(() => {
    const mgr = getAudioManager();
    mgr.setScene('start');
    mgr.setMuted(muted);
    if (!muted) {
      playBgmByKey('startPage');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    // 用户交互后解锁音频播放
    getAudioManager().unlock();
    // 开始播放开始页 BGM
    playBgmByKey('startPage');
    setPage('character-select');
  };

  const handleToggleMute = () => {
    const newMuted = !mutedState;
    setMutedState(newMuted);
    setMuted(newMuted);
    getAudioManager().unlock();
    getAudioManager().setMuted(newMuted);
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.audioToggle}
        title={mutedState ? '取消静音' : '静音'}
        onClick={handleToggleMute}
      >
        {mutedState ? '🔇' : '🔊'}
      </button>
      <img
        className={styles.bgImage}
        src={imageAssets.backgrounds.start}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>生态播种者</h1>
          <p className={styles.subtitle}>
            城市污染荒地生态修复计划
          </p>
          <p className={styles.description}>
            从污染到绿意 — 修复每一寸受损的土地，重建生态平衡
          </p>
        </div>
        {/* 方案 A：版本标签作为按钮上方独立徽章，不遮挡按钮主文案 */}
        <span className={styles.versionBadge}>v0.1 · 生态修复原型</span>
        <button
          className={styles.startButton}
          onClick={handleStart}
        >
          <span className={styles.startButtonIcon}>🌱</span>
          <span>开始修复</span>
        </button>
      </div>
    </div>
  );
}
