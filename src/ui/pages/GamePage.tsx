import { useEffect, useRef, useState } from 'react';
import { GameInstance } from '@/game/bootstrap/GameInstance';
import { useUIStore } from '@/store/uiStore';
import { usePlayerStore } from '@/store/playerStore';
import { useTaskStore } from '@/store/taskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { GameHud } from '@/ui/components/GameHud';
import { InteractionPrompt } from '@/ui/components/InteractionPrompt';
import { TaskPanel } from '@/ui/components/TaskPanel';
import { NpcDialog } from '@/ui/components/NpcDialog';
import { SettingsPanel } from '@/ui/components/SettingsPanel';
import { EnvironmentStatusPanel } from '@/ui/components/EnvironmentStatusPanel';
import { RestorationProgress } from '@/ui/components/RestorationProgress';
import { WorldStatus } from '@/ui/components/WorldStatus';
import { DailyTaskPanel } from '@/ui/components/DailyTaskPanel';
import { RightSidebar } from '@/ui/components/RightSidebar';
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

  useEffect(() => {
    if (!containerRef.current || !character) {
      setError('未选择角色，请返回重新选择。');
      return;
    }

    const instance = new GameInstance();
    gameInstanceRef.current = instance;

    try {
      instance.mount(containerRef.current, character.gender);
      // 延迟设置就绪状态，等待 Phaser 初始化
      const timer = setTimeout(() => setIsReady(true), 300);

      // 初始化每日任务（幂等）
      useDailyTaskStore.getState().init();

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
    useTaskStore.getState().resetTasks();
    useEnvironmentStore.getState().resetEnvironment();
    useSettingsStore.getState().resetSettings();
    // 每日任务不重置 — 返回开始页后不清空当日任务
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

      {isReady && <GameHud onReturnToStart={handleReturnToStart} />}
      {isReady && <WorldStatus />}
      {isReady && (
        <RightSidebar>
          <EnvironmentStatusPanel />
          <DailyTaskPanel />
        </RightSidebar>
      )}
      {isReady && <InteractionPrompt />}
      {isReady && <RestorationProgress />}
      {isReady && isTaskPanelOpen && <TaskPanel />}
      {isReady && isNpcDialogOpen && <NpcDialog />}
      {isReady && isSettingsOpen && <SettingsPanel />}
    </div>
  );
}
