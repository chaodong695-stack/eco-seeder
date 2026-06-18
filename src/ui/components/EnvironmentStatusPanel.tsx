/**
 * 环境状态面板组件。
 *
 * 从 EnvironmentStore 读取环境数据，显示区域环境指标。
 * 完成修复后自动更新。
 */

import { useEnvironmentStore } from '@/store/environmentStore';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import type { EnvironmentState } from '@/store/environmentStore';
import styles from './EnvironmentStatusPanel.module.css';

interface MetricConfig {
  key: keyof EnvironmentState;
  label: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: 'pollution', label: '污染程度', color: 'var(--color-danger)' },
  { key: 'vegetation', label: '植被状况', color: 'var(--color-eco-green)' },
  { key: 'waterQuality', label: '水质状态', color: 'var(--color-primary)' },
  { key: 'restorationProgress', label: '修复进度', color: 'var(--color-reward)' },
];

export function EnvironmentStatusPanel() {
  const envState = useEnvironmentStore((s) => s.state);
  const visualStage = useEnvironmentStore((s) => s.visualStage);

  const stageLabel =
    visualStage === 'polluted'
      ? '污染状态'
      : visualStage === 'recovering'
        ? '修复中'
        : '已恢复';

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        区域：{V0_1_MAIN_MAP_IDENTITY.displayName} · {stageLabel}
      </div>
      {METRICS.map((metric) => (
        <div key={metric.key} className={styles.metric}>
          <span className={styles.metricLabel}>{metric.label}</span>
          <div className={styles.metricBar}>
            <div
              className={styles.metricFill}
              style={{
                width: `${envState[metric.key]}%`,
                background: metric.color,
              }}
            />
          </div>
          <span className={styles.metricValue}>
            {metric.key === 'restorationProgress'
              ? `${envState[metric.key]}%`
              : envState[metric.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
