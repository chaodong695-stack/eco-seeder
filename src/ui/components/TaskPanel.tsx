import { useUIStore } from '@/store/uiStore';
import type { TaskSummary } from '@/types';
import styles from './TaskPanel.module.css';

// 占位任务数据
const PLACEHOLDER_TASKS: TaskSummary[] = [
  {
    instanceId: 'task.instance.001',
    definitionId: 'task.daily.clear_drain',
    name: '清理排水口',
    category: 'daily',
    status: 'available',
    description: '清理堵塞的排水口，提高区域排水能力。',
  },
  {
    instanceId: 'task.instance.002',
    definitionId: 'task.daily.sort_waste',
    name: '分类清理废弃物',
    category: 'daily',
    status: 'available',
    description: '在垃圾场区域分类清理固体废弃物。',
  },
];

export function TaskPanel() {
  const setTaskPanelOpen = useUIStore((s) => s.setTaskPanelOpen);

  return (
    <div className={styles.overlay} onClick={() => setTaskPanelOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>任务面板</span>
          <button
            className={styles.closeBtn}
            onClick={() => setTaskPanelOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className={styles.panelBody}>
          {PLACEHOLDER_TASKS.length === 0 ? (
            <p className={styles.emptyText}>暂无任务</p>
          ) : (
            PLACEHOLDER_TASKS.map((task) => (
              <div key={task.instanceId} className={styles.taskItem}>
                <div className={styles.taskName}>{task.name}</div>
                <div className={styles.taskDesc}>{task.description}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
