import { useEffect, useRef, useState } from 'react';
import { GameInstance } from '@/game/bootstrap/GameInstance';
import { useUIStore } from '@/store/uiStore';
import { usePlayerStore } from '@/store/playerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { GameHud } from '@/ui/components/GameHud';
import { InteractionPrompt } from '@/ui/components/InteractionPrompt';
import { TaskPanel } from '@/ui/components/TaskPanel';
import { NpcDialog } from '@/ui/components/NpcDialog';
import { SettingsPanel } from '@/ui/components/SettingsPanel';
import { EnvironmentStatusPanel, EnvironmentStatusSummary } from '@/ui/components/EnvironmentStatusPanel';
import { RestorationProgress } from '@/ui/components/RestorationProgress';
import { WorldStatus } from '@/ui/components/WorldStatus';
import { DailyTaskPanel, DailyTaskSummary } from '@/ui/components/DailyTaskPanel';
import { CollapsibleRightHud } from '@/ui/components/CollapsibleRightHud';
import { DevDebugPanel } from '@/ui/components/DevDebugPanel';
import { resetWorldSession } from '@/game/session/resetWorldSession';
import { getAudioManager, playSfxByKey, playBgmByKey } from '@/game/audio/audioManager';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import styles from './GamePage.module.css';

export function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<GameInstance | null>(null);
  const [isReady, setIsReady] = useState(false);

  const character = usePlayerStore((s) => s.character);
  const returnToStart = useUIStore((s) => s.returnToStart);
  const isTaskPanelOpen = useUIStore((s) => s.isTaskPanelOpen);
  const isNpcDialogOpen = useUIStore((s) => s.isNpcDialogOpen);
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const errorMessage = useUIStore((s) => s.errorMessage);
  const setError = useUIStore((s) => s.setError);

  // 监听 settingsStore 静音变化，同步到 AudioManager
  const muted = useSettingsStore((s) => s.muted);
  useEffect(() => {
    getAudioManager().setMuted(muted);
  }, [muted]);

  // 监听游戏事件 — 任务完成、修复成功和 NPC 随机任务音效
  useEffect(() => {
    const unsubTaskComplete = gameBridge.on('DAILY_TASK_COMPLETED', () => {
      playSfxByKey('taskComplete');
    });
    const unsubRestorationComplete = gameBridge.on('RESTORATION_COMPLETED', () => {
      playSfxByKey('restoreSuccess');
    });
    const unsubNpcDialogOpen = gameBridge.on('NPC_DIALOG_OPEN', () => {
      // 只在 NPC 有可接取任务时播放 NPC 随机任务音效
      const tasks = useDailyTaskStore.getState().tasks;
      const hasAvailable = tasks.some((t) => t.status === 'available');
      if (hasAvailable) {
        playSfxByKey('npcRandomTask');
      }
    });

    return () => {
      unsubTaskComplete();
      unsubRestorationComplete();
      unsubNpcDialogOpen();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !character) {
      setError('未选择角色，请返回重新选择。');
      return;
    }

    const instance = new GameInstance();
    gameInstanceRef.current = instance;

    try {
      instance.mount(containerRef.current, character.gender);

      // 进入游戏主场景 — 切换到游戏 BGM
      getAudioManager().setScene('game');
      getAudioManager().unlock();
      playBgmByKey('wasteland');

      // 延迟设置就绪状态，等待 Phaser 初始化
      const timer = setTimeout(() => setIsReady(true), 300);

      return () => {
        clearTimeout(timer);
        instance.destroy();
        gameInstanceRef.current = null;
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误';
      setError(`游戏场景初始化失败: ${message}`);
    }
  }, [character, setError]);

  const handleReturnToStart = () => {
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy();
      gameInstanceRef.current = null;
    }
    setIsReady(false);
    // 重置所有世界状态 — 返回开始页视为结束当前局
    // 重新选择角色进入时，resetWorldSession 会再次调用确保干净
    // 但在此处调用可以防止 React 组件在卸载前读取旧状态
    resetWorldSession();
    useSettingsStore.getState().resetSettings();

    // 停止游戏 BGM，切换回开始页 BGM
    getAudioManager().stopBgm();
    getAudioManager().setScene('start');
    getAudioManager().unlock();
    playBgmByKey('startPage');

    returnToStart();
  };

  if (errorMessage) {
    return (
      <div className={styles.errorOverlay}>
        <div className={styles.errorBox}>
          <h3 className={styles.errorTitle}>加载错误</h3>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button onClick={handleReturnToStart}>返回开始页面</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.gameContainer} />

      {!isReady && (
        <div className={styles.loadingOverlay}>
          <span className={styles.loadingText}>加载中...</span>
        </div>
      )}

      {isReady && <GameHud onReturnToStart={handleReturnToStart} characterName={character?.displayName} />}
      {isReady && <WorldStatus />}
      {isReady && (
        <CollapsibleRightHud
          environmentSummary={<EnvironmentStatusSummary />}
          environmentDetail={<EnvironmentStatusPanel />}
          dailyTasksSummary={<DailyTaskSummary />}
          dailyTasksDetail={<DailyTaskPanel />}
        />
      )}
      {isReady && <InteractionPrompt />}
      {isReady && <RestorationProgress />}
      {isReady && isTaskPanelOpen && <TaskPanel />}
      {isReady && isNpcDialogOpen && <NpcDialog />}
      {isReady && isSettingsOpen && <SettingsPanel />}
      {isReady && import.meta.env.DEV && <DevDebugPanel />}
    </div>
  );
}
