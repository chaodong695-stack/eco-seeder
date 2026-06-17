import type { MapState } from '@/types';
import { useWorldStore } from '@/store/worldStore';
import { getMapVisualStage } from '@/content/maps/urbanWasteland';
import styles from './EnvironmentStatusPanel.module.css';

interface MetricConfig {
  key: keyof MapState;
  label: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: 'airPollution', label: '空气污染', color: 'var(--color-danger)' },
  { key: 'waterContamination', label: '水体污染', color: 'var(--color-danger)' },
  { key: 'vegetation', label: '植被恢复', color: 'var(--color-eco-green)' },
  { key: 'biodiversity', label: '生物多样性', color: 'var(--color-eco-green)' },
];

export function EnvironmentStatusPanel() {
  const mapState = useWorldStore((s) => s.mapState);
  const visualStage = getMapVisualStage(mapState);
  const stageLabel =
    visualStage === 'polluted'
      ? '污染状态'
      : visualStage === 'restoring'
        ? '修复中'
        : '已恢复';

  return (
    <div className={styles.panel}>
      <div className={styles.title}>环境状态 · {stageLabel}</div>
      {METRICS.map((metric) => (
        <div key={metric.key} className={styles.metric}>
          <span className={styles.metricLabel}>{metric.label}</span>
          <div className={styles.metricBar}>
            <div
              className={styles.metricFill}
              style={{
                width: `${mapState[metric.key]}%`,
                background: metric.color,
              }}
            />
          </div>
          <span className={styles.metricValue}>{mapState[metric.key]}</span>
        </div>
      ))}
    </div>
  );
}
