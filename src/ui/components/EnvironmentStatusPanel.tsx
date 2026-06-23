/**
 * 环境状态面板组件。
 *
 * 从 EnvironmentStore 读取环境数据，显示区域环境指标。
 * 完成修复后自动更新。
 *
 * DEV-06 第三轮修复：
 * - 支持紧凑摘要模式（用于折叠 HUD 标题栏）；
 * - 支持完整详情模式（用于折叠 HUD 展开内容）。
 *
 * DEV-06 美术化：
 * - 使用 pollution-pile.png / restored-plants.png 直观展示修复状态。
 */

import { useEnvironmentStore } from '@/store/environmentStore';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import type { EnvironmentState } from '@/store/environmentStore';
import { imageAssets } from '@/game/assets/assetManifest';
import type { RestorationVisualStage } from '@/game/restoration/restorationTypes';
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

function getStageLabel(stage: RestorationVisualStage): string {
  if (stage === 'polluted') return '污染状态';
  if (stage === 'recovering') return '修复中';
  return '已恢复';
}

function getStageIconSrc(stage: RestorationVisualStage): string {
  // 未修复 / 修复中 → 污染堆图标
  // 已修复 → 植物图标
  if (stage === 'restored') return imageAssets.objects.restoredPlants;
  return imageAssets.objects.pollutionPile;
}

export function EnvironmentStatusPanel() {
  const envState = useEnvironmentStore((s) => s.state);
  const visualStage = useEnvironmentStore((s) => s.visualStage);

  const stageLabel = getStageLabel(visualStage);
  const stageIconSrc = getStageIconSrc(visualStage);

  return (
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <img
          className={styles.stageIcon}
          src={stageIconSrc}
          alt={stageLabel}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className={styles.title}>
          {V0_1_MAIN_MAP_IDENTITY.displayName} · {stageLabel}
        </span>
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

/**
 * 环境状态紧凑摘要 — 用于折叠 HUD 标题栏。
 */
export function EnvironmentStatusSummary() {
  const envState = useEnvironmentStore((s) => s.state);
  const visualStage = useEnvironmentStore((s) => s.visualStage);

  const stageLabel = getStageLabel(visualStage);

  return (
    <>
      {stageLabel} · 修复 {envState.restorationProgress}%
    </>
  );
}
