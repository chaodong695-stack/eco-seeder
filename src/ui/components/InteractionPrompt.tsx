/**
 * 交互提示与反馈 UI 组件。
 *
 * 监听 GameBridge 事件，显示交互提示和交互结果反馈。
 * 不直接访问 Phaser 内部对象。
 *
 * DEV-03 扩展：监听 TASK_FEEDBACK 事件显示任务反馈。
 */

import { useEffect, useState } from 'react';
import { gameBridge } from '@/game/bridge/GameBridge';
import type {
  InteractionAvailablePayload,
  InteractionTriggeredPayload,
} from '@/game/interaction/interactionTypes';
import type { TaskFeedbackPayload } from '@/game/bridge/GameBridge';
import styles from './InteractionPrompt.module.css';

interface InteractionPromptState {
  available: boolean;
  displayName: string;
  hint: string;
}

export function InteractionPrompt() {
  const [prompt, setPrompt] = useState<InteractionPromptState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubAvailable = gameBridge.on(
      'INTERACTION_AVAILABLE',
      (payload: InteractionAvailablePayload) => {
        setPrompt({
          available: true,
          displayName: payload.displayName,
          hint: payload.hint,
        });
      },
    );

    const unsubUnavailable = gameBridge.on('INTERACTION_UNAVAILABLE', () => {
      setPrompt(null);
    });

    const unsubTriggered = gameBridge.on(
      'INTERACTION_TRIGGERED',
      (payload: InteractionTriggeredPayload) => {
        setFeedback(payload.message);
        if (feedbackTimer) clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => setFeedback(null), 3000);
      },
    );

    const unsubTaskFeedback = gameBridge.on(
      'TASK_FEEDBACK',
      (payload: TaskFeedbackPayload) => {
        setFeedback(payload.message);
        if (feedbackTimer) clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => setFeedback(null), 4000);
      },
    );

    return () => {
      unsubAvailable();
      unsubUnavailable();
      unsubTriggered();
      unsubTaskFeedback();
      if (feedbackTimer) clearTimeout(feedbackTimer);
    };
  }, []);

  return (
    <>
      {prompt && (
        <div className={styles.promptContainer}>
          <span className={styles.promptHint}>
            {prompt.displayName} — {prompt.hint}
          </span>
        </div>
      )}
      {feedback && (
        <div className={styles.feedbackContainer}>
          <span className={styles.feedbackText}>{feedback}</span>
        </div>
      )}
    </>
  );
}
