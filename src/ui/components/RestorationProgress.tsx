/**
 * 修复进度 UI 组件。
 *
 * 监听 GameBridge 修复事件，显示清理进度条。
 * 不直接访问 Phaser 内部对象。
 *
 * DEV-06 美术化：使用 pollution-pile.png / restored-plants.png 图标。
 */

import { useEffect, useState, useRef } from 'react';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useUIStore } from '@/store/uiStore';
import type {
  RestorationStartedPayload,
  RestorationProgressPayload,
  RestorationInterruptedPayload,
  RestorationCompletedPayload,
} from '@/game/restoration/restorationTypes';
import { progressToPercent, progressBarText } from '@/game/restoration/restorationProgress';
import { imageAssets } from '@/game/assets/assetManifest';
import styles from './RestorationProgress.module.css';

interface RestorationProgressState {
  visible: boolean;
  displayName: string;
  progress: number;
  interrupted: boolean;
  completed: boolean;
  /** 玩家是否在交互范围内 — 用于中断状态下的 UI 显隐。 */
  inRange: boolean;
}

const initialState: RestorationProgressState = {
  visible: false,
  displayName: '',
  progress: 0,
  interrupted: false,
  completed: false,
  inRange: true,
};

/** 离开范围后短暂提示的自动隐藏时长（毫秒）。 */
const OUT_OF_RANGE_HIDE_DELAY_MS = 2000;

export function RestorationProgress() {
  const [state, setState] = useState<RestorationProgressState>(initialState);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubStarted = gameBridge.on(
      'RESTORATION_STARTED',
      (payload: RestorationStartedPayload) => {
        // 开始清理时清除任何待处理的隐藏定时器
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setState({
          visible: true,
          displayName: payload.displayName,
          progress: 0,
          interrupted: false,
          completed: false,
          inRange: true,
        });
      },
    );

    const unsubProgress = gameBridge.on(
      'RESTORATION_PROGRESS',
      (payload: RestorationProgressPayload) => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          visible: true,
          progress: payload.progress,
          interrupted: false,
          completed: false,
          inRange: true,
        }));
      },
    );

    const unsubInterrupted = gameBridge.on(
      'RESTORATION_INTERRUPTED',
      (payload: RestorationInterruptedPayload) => {
        // 清除任何待处理的隐藏定时器
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }

        if (payload.inRange) {
          // 玩家在范围内（如松开 E）— 显示暂停提示，等待按住 E 继续
          setState((prev) => ({
            ...prev,
            visible: true,
            progress: payload.progress,
            interrupted: true,
            completed: false,
            inRange: true,
          }));
        } else {
          // 玩家离开范围 — 短暂显示提示后自动隐藏
          setState((prev) => ({
            ...prev,
            visible: true,
            progress: payload.progress,
            interrupted: true,
            completed: false,
            inRange: false,
          }));
          hideTimerRef.current = setTimeout(() => {
            setState((prev) =>
              prev.interrupted && !prev.inRange
                ? { ...prev, visible: false }
                : prev,
            );
            hideTimerRef.current = null;
          }, OUT_OF_RANGE_HIDE_DELAY_MS);
        }
      },
    );

    const unsubCompleted = gameBridge.on(
      'RESTORATION_COMPLETED',
      (payload: RestorationCompletedPayload) => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setState({
          visible: true,
          displayName: payload.displayName,
          progress: 1,
          interrupted: false,
          completed: true,
          inRange: true,
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
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  // 离开游戏页面时重置状态，确保不残留进度 UI
  useEffect(() => {
    const unsub = useUIStore.subscribe((uiState) => {
      if (uiState.currentPage !== 'game') {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setState(initialState);
      }
    });
    return unsub;
  }, []);

  if (!state.visible) return null;

  const percent = progressToPercent(state.progress);
  const bar = progressBarText(state.progress);

  const headerText = state.completed
    ? `${state.displayName} — 清理完成`
    : `正在清理${state.displayName}`;

  // 中断且不在范围内 — 显示离开提示
  const hintText = state.completed
    ? '✓ 已完成临时清理'
    : state.interrupted
      ? state.inRange
        ? '清理已暂停 — 按住 E 继续'
        : '清理已暂停，请返回污染物堆附近继续'
      : '松开 E 将暂停清理';

  const iconSrc = state.completed
    ? imageAssets.objects.restoredPlants
    : imageAssets.objects.pollutionPile;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img
          className={styles.headerIcon}
          src={iconSrc}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {headerText}
      </div>
      <div className={styles.progressBar}>
        <span className={styles.barText}>{bar}</span>
        <span className={styles.percent}>{percent}%</span>
      </div>
      <div className={styles.hint}>{hintText}</div>
    </div>
  );
}
