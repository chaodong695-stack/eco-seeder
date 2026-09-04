import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getAudioManager, playBgmByKey } from '@/game/audio/audioManager';
import { imageAssets } from '@/game/assets/assetManifest';
import styles from './StartPage.module.css';

const smokeParticles = Array.from({ length: 12 }, (_, index) => index);

export function StartPage() {
  const setPage = useUIStore((s) => s.setPage);
  const muted = useSettingsStore((s) => s.muted);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const [mutedState, setMutedState] = useState(muted);

  useEffect(() => {
    const mgr = getAudioManager();
    mgr.setScene('start');
    mgr.setMuted(muted);
    if (!muted) playBgmByKey('startPage');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    getAudioManager().unlock();
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
    <main className={styles.container}>
      <div className={styles.backgroundScene} aria-hidden="true">
        <img className={styles.bgImage} src={imageAssets.backgrounds.start} alt="" />
        <div className={styles.colorGrade} />
        <div className={styles.smokeLayer}>
          {smokeParticles.map((particle) => (
            <i key={particle} className={styles.smokeParticle} />
          ))}
        </div>
        <div className={`${styles.riverMist} ${styles.riverMistForward}`} />
        <div className={`${styles.riverMist} ${styles.riverMistReverse}`} />
        <div className={styles.industryLights} />
        <div className={styles.waterGlints} />
        <div className={styles.vignette} />
      </div>

      <button
        className={styles.audioToggle}
        title={mutedState ? '取消静音' : '静音'}
        aria-label={mutedState ? '取消静音' : '静音'}
        onClick={handleToggleMute}
      >
        <span className={mutedState ? styles.soundOff : styles.soundOn} aria-hidden="true" />
      </button>

      <section className={styles.content}>
        <div className={styles.eyebrow}>ECO SEEDER</div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>生态播种者</h1>
          <p className={styles.description}>
            在受损的土地上<br />
            重新建立人与生态系统的连接
          </p>
        </div>
        <button className={styles.startButton} onClick={handleStart}>
          <span>开始修复</span>
          <span className={styles.buttonArrow} aria-hidden="true">↗</span>
        </button>
        <div className={styles.sectorLabel}>雾港生态修复计划 <span>·</span> SECTOR 01</div>
      </section>
    </main>
  );
}
