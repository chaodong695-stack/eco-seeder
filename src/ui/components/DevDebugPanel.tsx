/**
 * 开发调试面板 — 仅在 import.meta.env.DEV 时渲染。
 *
 * 显示当前状态快照，用于排查任务状态来源。
 * 生产环境不会渲染此组件。
 */

import { useState, useEffect } from 'react';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { useWorldStore } from '@/store/worldStore';
import { usePlayerStore } from '@/store/playerStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useTaskStore } from '@/store/taskStore';
import { resetWorldSession } from '@/game/session/resetWorldSession';
import {
  loadDailyTasks,
  DAILY_TASKS_STORAGE_KEY,
} from '@/domain/tasks/dailyTaskPersistence';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { buildDailyTaskSeed } from '@/domain/tasks/dailyTaskGenerator';
import { ANONYMOUS_PLAYER_ID } from '@/domain/time/worldTimeService';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { DAILY_TASK_POOL_VERSION } from '@/domain/tasks/dailyTaskDefinitions';
import styles from './DevDebugPanel.module.css';

export function DevDebugPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [tick, setTick] = useState(0);

  // 定时刷新面板数据
  useEffect(() => {
    if (collapsed) return;
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [collapsed]);

  // 读取状态
  const dailyTaskState = useDailyTaskStore.getState();
  const worldState = useWorldStore.getState();
  const playerState = usePlayerStore.getState();
  const envState = useEnvironmentStore.getState();
  const persisted = loadDailyTasks();

  const selectedCharacterId = playerState.character?.characterId ?? 'none';
  const currentWeather = worldState.getDisplayWeather();
  const localDate = worldState.timeSnapshot.localDate;

  const seed = buildDailyTaskSeed({
    anonymousPlayerId: ANONYMOUS_PLAYER_ID,
    selectedCharacterId,
    localDate,
    mapId: V0_1_MAIN_MAP_IDENTITY.id,
    dailyTaskPoolVersion: DAILY_TASK_POOL_VERSION,
    availableWeatherTypes: [],
  });

  // 用于触发重新渲染
  void tick;

  if (collapsed) {
    return (
      <button
        className={styles.toggleBtn}
        onClick={() => setCollapsed(false)}
        title="展开调试面板"
      >
        🔧
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>DEV 调试面板</span>
        <button className={styles.closeBtn} onClick={() => setCollapsed(true)}>
          ✕
        </button>
      </div>
      <div className={styles.body}>
        <section className={styles.section}>
          <h4>每日任务 Store</h4>
          <div className={styles.field}>
            <span>isInitialized:</span> {String(dailyTaskState.isInitialized)}
          </div>
          <div className={styles.field}>
            <span>localDate:</span> {dailyTaskState.localDate || '(空)'}
          </div>
          <div className={styles.field}>
            <span>selectedCharacterId:</span>{' '}
            {dailyTaskState.selectedCharacterId || '(空)'}
          </div>
          <div className={styles.field}>
            <span>任务数:</span> {dailyTaskState.tasks.length}
          </div>
          <div className={styles.field}>
            <span>已消费 sourceId:</span>{' '}
            {Array.from(dailyTaskState.contributedSources).join(', ') || '(空)'}
          </div>
          {dailyTaskState.tasks.map((task) => {
            const def = findDailyTaskById(task.taskId);
            return (
              <div key={task.instanceId} className={styles.taskItem}>
                <span>{def?.title ?? task.taskId}</span>
                <span> | {task.status}</span>
                <span> | {task.progress}/{task.targetValue}</span>
                {task.rewardClaimed && <span> | 奖励已发放</span>}
              </div>
            );
          })}
        </section>

        <section className={styles.section}>
          <h4>世界状态</h4>
          <div className={styles.field}>
            <span>localDate:</span> {localDate}
          </div>
          <div className={styles.field}>
            <span>当前天气:</span> {currentWeather}
          </div>
          <div className={styles.field}>
            <span>时间模式:</span> {worldState.timeSnapshot.mode}
          </div>
        </section>

        <section className={styles.section}>
          <h4>角色</h4>
          <div className={styles.field}>
            <span>selectedCharacterId:</span> {selectedCharacterId}
          </div>
          <div className={styles.field}>
            <span>gender:</span> {playerState.character?.gender ?? 'none'}
          </div>
        </section>

        <section className={styles.section}>
          <h4>区域状态</h4>
          <div className={styles.field}>
            <span>修复进度:</span> {envState.state.restorationProgress}%
          </div>
          <div className={styles.field}>
            <span>污染程度:</span> {envState.state.pollution}
          </div>
          <div className={styles.field}>
            <span>视觉阶段:</span> {envState.visualStage}
          </div>
          <div className={styles.field}>
            <span>已应用效果:</span>{' '}
            {Array.from(envState.appliedTargetIds).join(', ') || '(空)'}
          </div>
        </section>

        <section className={styles.section}>
          <h4>localStorage</h4>
          <div className={styles.field}>
            <span>存储 key:</span> {DAILY_TASKS_STORAGE_KEY}
          </div>
          <div className={styles.field}>
            <span>有数据:</span> {persisted ? '是' : '否'}
          </div>
          {persisted && (
            <>
              <div className={styles.field}>
                <span>date:</span> {persisted.date}
              </div>
              <div className={styles.field}>
                <span>selectedCharacterId:</span>{' '}
                {persisted.selectedCharacterId ?? '(旧数据无此字段)'}
              </div>
              <div className={styles.field}>
                <span>contributedSources:</span>{' '}
                {persisted.contributedSources?.join(', ') ?? '(无)'}
              </div>
              <div className={styles.field}>
                <span>restorationProgress:</span>{' '}
                {persisted.restorationProgress ?? '(旧数据无此字段)'}
              </div>
              <div className={styles.field}>
                <span>任务 payload:</span>
              </div>
              <pre className={styles.jsonPre}>
                {JSON.stringify(persisted.tasks, null, 2)}
              </pre>
            </>
          )}
        </section>

        <section className={styles.section}>
          <h4>生成种子</h4>
          <div className={styles.field}>
            <span>seed:</span> {seed}
          </div>
        </section>

        <section className={styles.section}>
          <h4>旧任务 Store</h4>
          <div className={styles.field}>
            <span>任务数:</span> {Object.keys(useTaskStore.getState().tasks).length}
          </div>
        </section>

        <section className={styles.section}>
          <h4>开发操作</h4>
          <button
            className={styles.closeBtn}
            onClick={() => resetWorldSession()}
            title="重置所有世界状态（每日任务、区域修复、旧任务）"
          >
            🔧 手动 resetWorldSession
          </button>
        </section>
      </div>
    </div>
  );
}
