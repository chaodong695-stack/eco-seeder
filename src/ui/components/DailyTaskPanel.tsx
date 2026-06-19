/**
 * 每日任务面板组件。
 *
 * 显示当日 3 个每日任务的标题、来源 NPC、进度、状态、天气限制和完成状态。
 * 数据来源于 dailyTaskStore（唯一事实来源）。
 *
 * DEV-06 第三轮修复：
 * - 支持紧凑摘要模式（用于折叠 HUD 标题栏）；
 * - 详情模式增加完成方式提示。
 */

import { useMemo } from 'react';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { isWeatherConditionMet, getWaitingWeatherText } from '@/domain/tasks/dailyTaskConditionResolver';
import { useWorldStore } from '@/store/worldStore';
import { WEATHER_DEFINITIONS } from '@/domain/weather/weatherTypes';
import { findNpcById } from '@/game/npc/npcDefinitions';
import type { DailyTaskStatus } from '@/domain/tasks/dailyTaskTypes';
import styles from './DailyTaskPanel.module.css';

const STATUS_TEXT: Record<DailyTaskStatus, string> = {
  available: '可接取',
  active: '进行中',
  waiting_condition: '等待天气',
  completed: '已完成',
};

/** 完成方式提示文本。 */
const COMPLETION_HINTS: Record<string, string> = {
  collect_waste: '靠近污染物堆，按住 E 清理',
  restore_area: '靠近受损环境点，按 E 修复',
  inspect_drainage: '靠近排水设施，按 E 检查（需雨天）',
  collect_storm_waste: '靠近暴雨冲散垃圾，按 E 清理（需暴雨）',
  ecology_patrol: '靠近生态巡查点，按 E 记录',
  fog_hazard_marking: '靠近雾天危险点，按 E 标记（需雾天）',
};

export function DailyTaskPanel() {
  const tasks = useDailyTaskStore((s) => s.tasks);
  const currentWeather = useWorldStore.getState().getDisplayWeather();

  const taskItems = useMemo(() => {
    return tasks.map((inst) => {
      const def = findDailyTaskById(inst.taskId);
      if (!def) return null;

      const npcDef = findNpcById(def.npcId);
      const supportedWeather = def.condition?.supportedWeather;
      const hasWeatherLimit = !!supportedWeather && supportedWeather.length > 0;
      const conditionMet = isWeatherConditionMet(def, currentWeather);
      const waitingText = hasWeatherLimit
        ? getWaitingWeatherText(def)
            .split('、')
            .map((w) => WEATHER_DEFINITIONS[w as keyof typeof WEATHER_DEFINITIONS]?.displayName ?? w)
            .join('、')
        : '';

      return {
        instanceId: inst.instanceId,
        title: def.title,
        description: def.description,
        npcName: npcDef?.displayName ?? '未知',
        status: inst.status,
        progress: inst.progress,
        targetValue: inst.targetValue,
        hasWeatherLimit,
        conditionMet,
        waitingText,
        rewardClaimed: inst.rewardClaimed,
        rewardValue: def.reward?.restorationValue,
        objectiveType: def.objectiveType,
      };
    }).filter((t): t is NonNullable<typeof t> => t !== null);
  }, [tasks, currentWeather]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>每日任务</span>
      </div>
      <div className={styles.body}>
        {taskItems.length === 0 ? (
          <p className={styles.emptyText}>暂无每日任务</p>
        ) : (
          taskItems.map((task) => (
            <div key={task.instanceId} className={styles.taskItem}>
              <div className={styles.taskHeader}>
                <span className={styles.taskName}>{task.title}</span>
                <span
                  className={`${styles.taskStatus} ${
                    task.status === 'completed'
                      ? styles.statusDone
                      : task.status === 'waiting_condition'
                        ? styles.statusWaiting
                        : task.status === 'active'
                          ? styles.statusActive
                          : styles.statusAvailable
                  }`}
                >
                  {task.status === 'completed' && '✓ '}
                  {task.status === 'waiting_condition' && '⏳ '}
                  {task.status === 'active' && '▶ '}
                  {task.status === 'available' && '○ '}
                  {STATUS_TEXT[task.status]}
                </span>
              </div>
              <div className={styles.taskDesc}>{task.description}</div>
              <div className={styles.taskMeta}>
                <span className={styles.metaItem}>来源：{task.npcName}</span>
                <span className={styles.metaItem}>
                  进度：{task.progress}/{task.targetValue}
                </span>
                {task.hasWeatherLimit && (
                  <span className={styles.metaItem}>
                    天气限制：{task.waitingText}
                    {task.status === 'waiting_condition' && '（当前不满足）'}
                  </span>
                )}
                {task.rewardValue !== undefined && (
                  <span className={styles.metaItem}>
                    奖励：恢复值 +{task.rewardValue}
                  </span>
                )}
                {COMPLETION_HINTS[task.objectiveType] && (
                  <span className={styles.metaItem}>
                    完成方式：{COMPLETION_HINTS[task.objectiveType]}
                  </span>
                )}
              </div>
              {task.status === 'waiting_condition' && (
                <div className={styles.waitingNotice}>
                  等待天气：{task.waitingText}
                </div>
              )}
              {task.status === 'completed' && task.rewardClaimed && (
                <div className={styles.completedNotice}>已完成，奖励已发放</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 每日任务紧凑摘要 — 用于折叠 HUD 标题栏。
 */
export function DailyTaskSummary() {
  const tasks = useDailyTaskStore((s) => s.tasks);

  const activeCount = tasks.filter(
    (t) => t.status === 'active' || t.status === 'waiting_condition',
  ).length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
  const totalTarget = tasks.reduce((sum, t) => sum + t.targetValue, 0);

  return (
    <>
      {activeCount + completedCount}/{tasks.length} · 进度 {totalProgress}/{totalTarget}
    </>
  );
}

export { COMPLETION_HINTS };
