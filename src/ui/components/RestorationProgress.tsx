/**
 * 修复进度 UI 组件。
 *
 * 监听 GameBridge 修复事件，显示清理进度条。
 * 不直接访问 Phaser 内部对象。
 */

import { useEffect, useState } from 'react';
import { gameBridge } from '@/game/bridge/GameBridge';
import type {
  RestorationStartedPayload,
  RestorationProgressPayload,
  RestorationInterruptedPayload,
  RestorationCompletedPayload,
} from '@/game/restoration/restorationTypes';
import { progressToPercent, progressBarText } from '@/game/restoration/restorationProgress';
import styles from './RestorationProgress.module.css';

interface RestorationProgressState {
  visible: boolean;
  displayName: string;
  progress: number;
  interrupted: boolean;
  completed: boolean;
}

const initialState: RestorationProgressState = {
  visible: false,
  displayName: '',
  progress: 0,
  interrupted: false,
  completed: false,
};

export function RestorationProgress() {
  const [state, setState] = useState<RestorationProgressState>(initialState);

  useEffect(() => {
    const unsubStarted = gameBridge.on(
      'RESTORATION_STARTED',
      (payload: RestorationStartedPayload) => {
        setState({
          visible: true,
          displayName: payload.displayName,
          progress: 0,
          interrupted: false,
          completed: false,
        });
      },
    );

    const unsubProgress = gameBridge.on(
      'RESTORATION_PROGRESS',
      (payload: RestorationProgressPayload) => {
        setState((prev) => ({
          ...prev,
          visible: true,
          progress: payload.progress,
          interrupted: false,
          completed: false,
        }));
      },
    );

    const unsubInterrupted = gameBridge.on(
      'RESTORATION_INTERRUPTED',
      (payload: RestorationInterruptedPayload) => {
        setState((prev) => ({
          ...prev,
          visible: true,
          progress: payload.progress,
          interrupted: true,
          completed: false,
        }));
      },
    );

    const unsubCompleted = gameBridge.on(
      'RESTORATION_COMPLETED',
      (_payload: RestorationCompletedPayload) => {
        setState({
          visible: true,
          displayName: _payload.displayName,
          progress: 1,
          interrupted: false,
          completed: true,
        });
        // 完成后延迟隐藏
        setTimeout(() => {
          setState(initialState);
        }, 1500);
      },
    );

    return () => {
      unsubStarted();
      unsubProgress();
      unsubInterrupted();
      unsubCompleted();
    };
  }, []);

  if (!state.visible) return null;

  const percent = progressToPercent(state.progress);
  const bar = progressBarText(state.progress);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {state.completed
          ? `${state.displayName} — 清理完成`
          : `正在清理${state.displayName}`}
      </div>
      <div className={styles.progressBar}>
        <span className={styles.barText}>{bar}</span>
        <span className={styles.percent}>{percent}%</span>
      </div>
      <div className={styles.hint}>
        {state.completed
          ? '✓ 已完成临时清理'
          : state.interrupted
            ? '清理已暂停 — 按住 E 继续'
            : '松开 E 将暂停清理'}
      </div>
    </div>
  );
}
