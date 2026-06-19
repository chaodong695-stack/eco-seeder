/**
 * 右侧栏容器 — 统一纵向排列区域状态面板和每日任务面板。
 *
 * 解决 DailyTaskPanel 遮挡 EnvironmentStatusPanel 的问题。
 * 两个面板各自设置 max-height 和内部滚动，不互相遮挡。
 */

import type { ReactNode } from 'react';
import styles from './RightSidebar.module.css';

interface RightSidebarProps {
  children: ReactNode;
}

export function RightSidebar({ children }: RightSidebarProps) {
  return <div className={styles.rightSidebar}>{children}</div>;
}
