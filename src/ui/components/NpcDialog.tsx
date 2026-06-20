/**
 * NPC 对话框组件。
 *
 * DEV-06 第二轮修复：
 * - 所有 NPC 只展示每日任务对话，不再混入旧任务系统；
 * - 林工不再出现"清理污染物"独立任务接受对话；
 * - 对话选项只触发每日任务动作。
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findNpcById } from '@/game/npc/npcDefinitions';
import { resolveDailyTaskDialog, type DailyTaskDialogAction, type DailyTaskDialogOption } from '@/game/npc/dailyTaskDialogResolver';
import { gameBridge } from '@/game/bridge/GameBridge';
import styles from './NpcDialog.module.css';

/** 每日任务 NPC ID 集合。 */
const DAILY_TASK_NPC_IDS = new Set(['npc_weather_ranger', 'npc.engineer.lin']);

export function NpcDialog() {
  const currentNpcId = useUIStore((s) => s.currentNpcId);
  const setNpcDialogOpen = useUIStore((s) => s.setNpcDialogOpen);

  const dailyTasks = useDailyTaskStore((s) => s.tasks);
  const acceptDailyTask = useDailyTaskStore((s) => s.acceptTask);
  const dailyTaskNpcTasks = useDailyTaskStore((s) => s.getTasksByNpcId);

  // 查找当前 NPC 配置
  const npcDef = currentNpcId ? findNpcById(currentNpcId) : undefined;

  // 是否为每日任务 NPC
  const isDailyTaskNpc = currentNpcId ? DAILY_TASK_NPC_IDS.has(currentNpcId) : false;

  // 每日任务 NPC 负责的任务列表
  const npcDailyTasks = useMemo(
    () => (currentNpcId ? dailyTaskNpcTasks(currentNpcId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNpcId, dailyTaskNpcTasks, dailyTasks],
  );

  // 解析每日任务对话内容
  const dialog = useMemo(() => {
    if (!npcDef || !isDailyTaskNpc) return null;
    return resolveDailyTaskDialog(
      npcDef.displayName,
      npcDef.role,
      npcDef.id,
      npcDailyTasks,
    );
  }, [npcDef, isDailyTaskNpc, npcDailyTasks]);

  // 关闭对话
  const closeDialog = useCallback(() => {
    const npcId = currentNpcId;
    setNpcDialogOpen(false);
    if (npcId) {
      gameBridge.emit('NPC_DIALOG_CLOSE', { npcId });
    }
  }, [currentNpcId, setNpcDialogOpen]);

  // 处理每日任务选项
  const handleDailyTaskOption = (action: DailyTaskDialogAction, instanceId?: string) => {
    switch (action) {
      case 'accept_one': {
        if (instanceId) {
          acceptDailyTask(instanceId);
        }
        break;
      }
      case 'accept_all':
      case 'dismiss':
      case 'close':
        closeDialog();
        break;
    }
  };

  // 按 Escape 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [closeDialog]);

  // 没有有效对话时不渲染
  if (!dialog || !npcDef) return null;

  return (
    <div className={styles.overlay} onClick={closeDialog}>
      <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <div className={styles.npcInfo}>
            <div className={styles.npcAvatar}>👤</div>
            <div>
              <div className={styles.npcName}>{dialog.npcName}</div>
              <div className={styles.npcRole}>{dialog.npcRole}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={closeDialog}>
            ✕
          </button>
        </div>
        <div className={styles.dialogBody}>
          {dialog.lines.map((line, idx) => (
            <p key={idx} className={styles.dialogLine}>
              {line}
            </p>
          ))}
        </div>
        <div className={styles.dialogFooter}>
          {(dialog.options as DailyTaskDialogOption[]).map((option, idx) => (
            <button
              key={idx}
              className={`${styles.optionBtn} ${
                option.action === 'accept_one' || option.action === 'accept_all'
                  ? styles.optionAccept
                  : styles.optionDefault
              }`}
              onClick={() => handleDailyTaskOption(option.action, option.instanceId)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
