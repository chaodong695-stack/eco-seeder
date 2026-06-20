import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';
import { V0_1_MAIN_MAP_IDENTITY } from '@/content/maps/urbanWasteland';
import { getAudioManager } from '@/game/audio/audioManager';
import styles from './GameHud.module.css';

interface GameHudProps {
  onReturnToStart: () => void;
  characterName?: string;
}

export function GameHud({ onReturnToStart, characterName }: GameHudProps) {
  const setTaskPanelOpen = useUIStore((s) => s.setTaskPanelOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const inputMode = useUIStore((s) => s.inputMode);
  const muted = useSettingsStore((s) => s.muted);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const character = usePlayerStore((s) => s.character);

  const isRestoration = inputMode === 'restoration';
  const isTaskOpen = inputMode === 'task';
  const isDialogOpen = inputMode === 'dialog';
  const isSettingsOpenUI = inputMode === 'settings';
  // 按钮在其他 UI 打开时禁用
  const disableTaskBtn = isRestoration || isDialogOpen || isSettingsOpenUI;
  const disableSettingsBtn = isRestoration || isTaskOpen || isDialogOpen;

  const displayName = characterName ?? character?.displayName ?? '修复员';

  const handleToggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    getAudioManager().unlock();
    getAudioManager().setMuted(newMuted);
  };

  const handleReturn = () => {
    onReturnToStart();
  };

  const handleTaskClick = () => {
    setTaskPanelOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <div className={styles.hud}>
      {/* 顶部栏 — 左上角：角色/区域信息 */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <div className={styles.charInfo}>
            <span className={styles.charIcon}>🛡️</span>
            <span className={styles.charName}>{displayName}</span>
          </div>
          <span className={styles.divider}>|</span>
          <span className={styles.mapName}>{V0_1_MAIN_MAP_IDENTITY.displayName}</span>
        </div>
        <div className={styles.topRight}>
          <button
            className={styles.iconBtn}
            title={muted ? '取消静音' : '静音'}
            onClick={handleToggleMute}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className={styles.iconBtn}
            title="设置"
            disabled={disableSettingsBtn}
            onClick={handleSettingsClick}
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
          onClick={handleTaskClick}
        >
          📋 任务
        </button>
        <button
          className={styles.bottomBtn}
          disabled={disableSettingsBtn}
          onClick={handleSettingsClick}
        >
          ⚙ 设置
        </button>
        <button className={styles.bottomBtn} onClick={handleReturn}>
          🏠 返回开始
        </button>
      </div>
    </div>
  );
}
