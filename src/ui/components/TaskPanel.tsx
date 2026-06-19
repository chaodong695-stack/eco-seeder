/**
 * 任务面板组件。
 *
 * DEV-06 第三轮修复：
 * - 完全从 dailyTaskStore 读取任务数据，不再使用旧 taskStore；
 * - 显示每日任务的完整详情：标题、描述、进度、目标值、来源 NPC、天气条件、当前状态、完成方式提示；
 * - 进行中任务 = status === "active" || status === "waiting_condition"。
 */

import { useMemo } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useWorldStore } from '@/store/worldStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import {
  isWeatherConditionMet,
  getWaitingWeatherText,
} from '@/domain/tasks/dailyTaskConditionResolver';
import { WEATHER_DEFINITIONS } from '@/domain/weather/weatherTypes';
import { findNpcById } from '@/game/npc/npcDefinitions';
import type { DailyTaskStatus } from '@/domain/tasks/dailyTaskTypes';
import styles from './TaskPanel.module.css';

/** 状态显示文本映射。 */
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

function weatherTypesToText(weatherTypes: string[]): string {
  return weatherTypes
    .map(
      (w) =>
        WEATHER_DEFINITIONS[w as keyof typeof WEATHER_DEFINITIONS]?.displayName ??
        w,
    )
    .join('、');
}

export function TaskPanel() {
  const setTaskPanelOpen = useUIStore((s) => s.setTaskPanelOpen);
  const tasks = useDailyTaskStore((s) => s.tasks);
  const currentWeather = useWorldStore.getState().getDisplayWeather();

  const visibleTasks = useMemo(() => {
    return tasks
      .filter(
        (inst) =>
          inst.status === 'active' ||
          inst.status === 'waiting_condition' ||
          inst.status === 'completed',
      )
      .map((inst) => {
        const def = findDailyTaskById(inst.taskId);
        if (!def) return null;

        const npcDef = findNpcById(def.npcId);
        const supportedWeather = def.condition?.supportedWeather;
        const hasWeatherLimit =
          !!supportedWeather && supportedWeather.length > 0;
        const conditionMet = isWeatherConditionMet(def, currentWeather);
        const waitingText = hasWeatherLimit
          ? weatherTypesToText(
              getWaitingWeatherText(def).split('、'),
            )
          : '';
        const completionHint = COMPLETION_HINTS[def.objectiveType] ?? '';

        return {
          instanceId: inst.instanceId,
          title: def.title,
          description: def.description,
          status: inst.status,
          progress: inst.progress,
          targetValue: inst.targetValue,
          npcName: npcDef?.displayName ?? '未知',
          hasWeatherLimit,
          conditionMet,
          waitingText,
          rewardValue: def.reward?.restorationValue,
          rewardClaimed: inst.rewardClaimed,
          completionHint,
        };
      })
      .filter(
        (t): t is NonNullable<typeof t> => t !== null,
      );
  }, [tasks, currentWeather]);

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
              <div key={task.instanceId} className={styles.taskItem}>
                <div className={styles.taskHeader}>
                  <span className={styles.taskName}>{task.title}</span>
                  <span
                    className={`${styles.taskStatus} ${
                      task.status === 'completed'
                        ? styles.statusDone
                        : task.status === 'waiting_condition'
                          ? styles.statusWaiting
                          : styles.statusActive
                    }`}
                  >
                    {task.status === 'completed' && '✓ '}
                    {task.status === 'waiting_condition' && '⏳ '}
                    {task.status === 'active' && '▶ '}
                    {STATUS_TEXT[task.status]}
                  </span>
                </div>
                {task.status === 'completed' ? (
                  <div className={styles.taskCompletedBar} />
                ) : null}
                <div className={styles.taskDesc}>{task.description}</div>
                <div className={styles.taskMeta}>
                  <span className={styles.metaItem}>
                    来源：{task.npcName}
                  </span>
                  <span className={styles.metaItem}>
                    进度：{task.progress}/{task.targetValue}
                  </span>
                  {task.hasWeatherLimit && (
                    <span className={styles.metaItem}>
                      天气条件：{task.waitingText}
                      {task.status === 'waiting_condition' && '（当前不满足）'}
                    </span>
                  )}
                  {task.rewardValue !== undefined && (
                    <span className={styles.metaItem}>
                      奖励：恢复值 +{task.rewardValue}
                    </span>
                  )}
                  {task.completionHint && (
                    <span className={styles.metaItem}>
                      完成方式：{task.completionHint}
                    </span>
                  )}
                </div>
                {task.status === 'completed' && task.rewardClaimed && (
                  <div className={styles.completedNotice}>
                    已完成，奖励已发放
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
