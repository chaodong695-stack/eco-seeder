import { useUIStore } from '@/store/uiStore';
import { playBgmByKey, playSfxByKey } from '@/game/audio/AudioManager';
import { imageAssets } from '@/game/assets/assetManifest';
import styles from './StartPage.module.css';

export function StartPage() {
  const setPage = useUIStore((s) => s.setPage);

  const handleStart = () => {
    playSfxByKey('click');
    // 用户交互后开始播放开始页 BGM
    playBgmByKey('start');
    setPage('character-select');
  };

  return (
    <div className={styles.container}>
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
        <button
          className={styles.startButton}
          onClick={handleStart}
        >
          <span className={styles.startButtonIcon}>🌱</span>
          <span>开始修复</span>
        </button>
        <p className={styles.footer}>v0.1 · 生态修复原型</p>
      </div>
    </div>
  );
}
