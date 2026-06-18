import { useUIStore } from '@/store/uiStore';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import styles from './GameHud.module.css';

interface GameHudProps {
  onReturnToStart: () => void;
}

export function GameHud({ onReturnToStart }: GameHudProps) {
  const setTaskPanelOpen = useUIStore((s) => s.setTaskPanelOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const inputMode = useUIStore((s) => s.inputMode);
  const isRestoration = inputMode === 'restoration';
  const isTaskOpen = inputMode === 'task';
  const isDialogOpen = inputMode === 'dialog';
  const isSettingsOpenUI = inputMode === 'settings';
  // 按钮在其他 UI 打开时禁用
  const disableTaskBtn = isRestoration || isDialogOpen || isSettingsOpenUI;
  const disableSettingsBtn = isRestoration || isTaskOpen || isDialogOpen;

  return (
    <div className={styles.hud}>
      {/* 顶部栏 */}
      <div className={styles.topBar}>
        <span className={styles.mapName}>{V0_1_MAIN_MAP_IDENTITY.displayName}</span>
        <div className={styles.topRight}>
          <button
            className={styles.iconBtn}
            title="设置"
            disabled={disableSettingsBtn}
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* 底部栏 */}
      <div className={styles.bottomBar}>
        <button
          className={styles.bottomBtn}
          disabled={disableTaskBtn}
          onClick={() => setTaskPanelOpen(true)}
        >
          任务
        </button>
        <button
          className={styles.bottomBtn}
          disabled={disableSettingsBtn}
          onClick={() => setSettingsOpen(true)}
        >
          设置
        </button>
        <button className={styles.bottomBtn} onClick={onReturnToStart}>
          返回开始
        </button>
      </div>
    </div>
  );
}
