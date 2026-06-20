import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorldStore } from '@/store/worldStore';
import { getAudioManager } from '@/game/audio/audioManager';
import type { DemoTimePreset } from '@/domain/time/timeTypes';
import { DAY_PHASE_DISPLAY_NAMES } from '@/domain/time/timeTypes';
import { ALL_WEATHER_TYPES, WEATHER_DEFINITIONS } from '@/domain/weather/weatherTypes';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import styles from './SettingsPanel.module.css';

const TIME_PRESET_OPTIONS: { value: DemoTimePreset | null; label: string }[] = [
  { value: null, label: '跟随现实时间' },
  { value: 'dawn', label: DAY_PHASE_DISPLAY_NAMES.dawn },
  { value: 'day', label: DAY_PHASE_DISPLAY_NAMES.day },
  { value: 'dusk', label: DAY_PHASE_DISPLAY_NAMES.dusk },
  { value: 'night', label: DAY_PHASE_DISPLAY_NAMES.night },
];

export function SettingsPanel() {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const {
    masterVolume,
    musicVolume,
    sfxVolume,
    voiceVolume,
    muted,
    timeMode,
    demoTimePreset,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setVoiceVolume,
    setMuted,
    setTimeMode,
  } = useSettingsStore();

  const setWorldTimeMode = useWorldStore((s) => s.setTimeMode);
  const devWeatherPreview = useWorldStore((s) => s.devWeatherPreview);
  const setDevWeatherPreview = useWorldStore((s) => s.setDevWeatherPreview);
  const exitDevWeatherPreview = useWorldStore((s) => s.exitDevWeatherPreview);

  const handleTimePresetChange = (value: DemoTimePreset | null) => {
    if (value === null) {
      setTimeMode('realtime', null);
      setWorldTimeMode('realtime', null);
    } else {
      setTimeMode('demo', value);
      setWorldTimeMode('demo', value);
    }
  };

  const handleMuteToggle = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    getAudioManager().unlock();
    getAudioManager().setMuted(newMuted);
  };

  const handleDevWeatherPreview = (weather: WeatherType) => {
    if (devWeatherPreview === weather) {
      exitDevWeatherPreview();
    } else {
      setDevWeatherPreview(weather);
    }
  };

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
              <span>演示时间</span>
            </label>
            <div className={styles.timePresetGroup}>
              {TIME_PRESET_OPTIONS.map((option) => {
                const isSelected =
                  option.value === null
                    ? timeMode === 'realtime'
                    : timeMode === 'demo' && demoTimePreset === option.value;
                return (
                  <button
                    key={option.label}
                    className={`${styles.presetBtn} ${isSelected ? styles.presetBtnActive : ''}`}
                    onClick={() => handleTimePresetChange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className={styles.devWeatherPreviewGroup}>
              <label className={styles.settingLabel}>
                <span>天气预览（开发）</span>
              </label>
              <div className={styles.timePresetGroup}>
                {ALL_WEATHER_TYPES.map((weather) => {
                  const isSelected = devWeatherPreview === weather;
                  const displayName = WEATHER_DEFINITIONS[weather].displayName;
                  return (
                    <button
                      key={weather}
                      className={`${styles.presetBtn} ${isSelected ? styles.presetBtnActive : ''}`}
                      onClick={() => handleDevWeatherPreview(weather)}
                    >
                      {displayName}
                    </button>
                  );
                })}
                {devWeatherPreview !== null && (
                  <button
                    className={styles.presetBtn}
                    onClick={() => exitDevWeatherPreview()}
                  >
                    退出预览
                  </button>
                )}
              </div>
            </div>
          )}

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
              onClick={handleMuteToggle}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleMuteToggle();
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
