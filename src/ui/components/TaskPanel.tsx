/**
 * 任务面板组件。
 *
 * DEV-03 重写：
 * - 从 TaskStore 读取任务数据，不再使用占位硬编码数据；
 * - 显示任务标题、状态、目标、奖励预览；
 * - 无活动任务时显示空状态；
 * - 关闭面板后任务状态不丢失。
 */

import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { TASK_DEFINITIONS } from '@/game/tasks/taskDefinitions';
import type { TaskStatus } from '@/game/tasks/taskTypes';
import styles from './TaskPanel.module.css';

/** 状态显示文本映射。 */
const STATUS_TEXT: Record<TaskStatus, string> = {
  available: '可接取',
  active: '进行中',
  objective_completed: '目标已完成',
  completed: '已完成',
};

export function TaskPanel() {
  const setTaskPanelOpen = useUIStore((s) => s.setTaskPanelOpen);
  const tasks = useTaskStore((s) => s.tasks);

  // 从任务定义和运行时状态组装显示数据
  const visibleTasks = TASK_DEFINITIONS.map((def) => {
    const state = tasks[def.id];
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      status: state?.status ?? 'available',
      objectiveText: state?.currentObjectiveText ?? '',
      reward: def.reward,
      rewardClaimed: state?.rewardClaimed ?? false,
    };
  }).filter((t) => t.status !== 'available');

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
          {visibleTasks.length === 0 ? (
            <p className={styles.emptyText}>暂无进行中的任务</p>
          ) : (
            visibleTasks.map((task) => (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskHeader}>
                  <span className={styles.taskName}>{task.title}</span>
                  <span
                    className={`${styles.taskStatus} ${
                      task.status === 'completed' ? styles.statusDone : styles.statusActive
                    }`}
                  >
                    {STATUS_TEXT[task.status]}
                  </span>
                </div>
                <div className={styles.taskDesc}>{task.description}</div>
                {task.objectiveText && (
                  <div className={styles.taskObjective}>
                    <span className={styles.objectiveLabel}>当前目标：</span>
                    {task.objectiveText}
                  </div>
                )}
                <div className={styles.taskReward}>
                  <span className={styles.rewardLabel}>奖励：</span>
                  <span className={styles.rewardItem}>
                    生态点数 {task.reward.ecoPoints}
                  </span>
                  <span className={styles.rewardItem}>
                    声望 {task.reward.reputation}
                  </span>
                  {task.rewardClaimed && (
                    <span className={styles.rewardClaimed}>已领取</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
