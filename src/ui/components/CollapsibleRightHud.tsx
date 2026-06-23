/**
 * 可折叠右侧 HUD 抽屉。
 *
 * 替换原来的 RightSidebar + 双面板常驻布局。
 * 默认仅显示紧凑标题和关键摘要，点击展开对应内容。
 * 可以只允许一个面板同时展开。
 * 点击地图区域时自动收起。
 * 小尺寸窗口下默认折叠。
 */

import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import styles from './CollapsibleRightHud.module.css';

export type HudSection = 'environment' | 'dailyTasks';

interface CollapsibleRightHudProps {
  /** 环境状态面板内容。 */
  environmentSummary: ReactNode;
  environmentDetail: ReactNode;
  /** 每日任务面板内容。 */
  dailyTasksSummary: ReactNode;
  dailyTasksDetail: ReactNode;
}

export function CollapsibleRightHud({
  environmentSummary,
  environmentDetail,
  dailyTasksSummary,
  dailyTasksDetail,
}: CollapsibleRightHudProps) {
  const [expandedSection, setExpandedSection] = useState<HudSection | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // 检测窗口大小 — 小屏默认折叠
  useEffect(() => {
    const checkSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // 小屏切换时自动收起
  useEffect(() => {
    if (isSmallScreen) {
      setExpandedSection(null);
    }
  }, [isSmallScreen]);

  const toggleSection = useCallback(
    (section: HudSection) => {
      setExpandedSection((prev) => (prev === section ? null : section));
    },
    [],
  );

  const collapseAll = useCallback(() => {
    setExpandedSection(null);
  }, []);

  const envExpanded = expandedSection === 'environment';
  const tasksExpanded = expandedSection === 'dailyTasks';

  return (
    <div className={styles.container} data-small-screen={isSmallScreen || undefined}>
      {/* 环境状态折叠栏 */}
      <div className={`${styles.section} ${envExpanded ? styles.expanded : ''}`}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('environment')}
        >
          <span className={styles.sectionTitle}>区域状态</span>
          <span className={styles.summary}>{environmentSummary}</span>
          <span className={styles.toggleIcon}>{envExpanded ? '▲' : '▼'}</span>
        </button>
        {envExpanded && (
          <div className={styles.sectionBody}>{environmentDetail}</div>
        )}
      </div>

      {/* 每日任务折叠栏 */}
      <div className={`${styles.section} ${tasksExpanded ? styles.expanded : ''}`}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('dailyTasks')}
        >
          <span className={styles.sectionTitle}>每日任务</span>
          <span className={styles.summary}>{dailyTasksSummary}</span>
          <span className={styles.toggleIcon}>{tasksExpanded ? '▲' : '▼'}</span>
        </button>
        {tasksExpanded && (
          <div className={styles.sectionBody}>{dailyTasksDetail}</div>
        )}
      </div>

      {/* 展开时显示关闭按钮（小屏模式） */}
      {expandedSection && (
        <button className={styles.collapseAllBtn} onClick={collapseAll}>
          收起
        </button>
      )}
    </div>
  );
}
