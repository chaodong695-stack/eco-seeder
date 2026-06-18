/**
 * 世界状态 HUD 组件 — 显示时间阶段、天气和模式。
 *
 * 显示内容来源于 World/Weather Store。
 * 不在组件中重新计算时间和天气。
 * 状态变化后自动更新。
 */

import { useWorldStore } from '@/store/worldStore';
import { DAY_PHASE_DISPLAY_NAMES, TIME_MODE_DISPLAY_NAMES } from '@/domain/time/timeTypes';
import { WEATHER_DEFINITIONS } from '@/domain/weather/weatherTypes';
import styles from './WorldStatus.module.css';

export function WorldStatus() {
  const timeSnapshot = useWorldStore((s) => s.timeSnapshot);
  const weatherSnapshot = useWorldStore((s) => s.weatherSnapshot);
  const devWeatherPreview = useWorldStore((s) => s.devWeatherPreview);

  const displayWeather = devWeatherPreview
    ? WEATHER_DEFINITIONS[devWeatherPreview].displayName
    : weatherSnapshot.displayName;

  return (
    <div className={styles.worldStatus}>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>时间阶段</span>
        <span className={styles.statusValue}>
          {DAY_PHASE_DISPLAY_NAMES[timeSnapshot.phase]}
        </span>
      </div>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>天气</span>
        <span className={styles.statusValue}>
          {displayWeather}{devWeatherPreview && '（预览）'}
        </span>
      </div>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>模式</span>
        <span className={styles.statusValue}>
          {TIME_MODE_DISPLAY_NAMES[timeSnapshot.mode]}
        </span>
      </div>
    </div>
  );
}
