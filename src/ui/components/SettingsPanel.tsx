import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const {
    masterVolume,
    musicVolume,
    sfxVolume,
    voiceVolume,
    muted,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setVoiceVolume,
    setMuted,
  } = useSettingsStore();

  return (
    <div className={styles.overlay} onClick={() => setSettingsOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>设置</span>
          <button
            className={styles.closeBtn}
            onClick={() => setSettingsOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              <span>主音量</span>
              <span className={styles.settingValue}>
                {Math.round(masterVolume * 100)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              <span>音乐音量</span>
              <span className={styles.settingValue}>
                {Math.round(musicVolume * 100)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              <span>音效音量</span>
              <span className={styles.settingValue}>
                {Math.round(sfxVolume * 100)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              <span>配音音量</span>
              <span className={styles.settingValue}>
                {Math.round(voiceVolume * 100)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={voiceVolume}
              onChange={(e) => setVoiceVolume(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.muteToggle}>
            <span className={styles.toggleLabel}>静音</span>
            <div
              className={`${styles.toggle} ${muted ? styles.toggleOn : ''}`}
              onClick={() => setMuted(!muted)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setMuted(!muted);
              }}
            >
              <div
                className={`${styles.toggleKnob} ${muted ? styles.toggleKnobOn : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
