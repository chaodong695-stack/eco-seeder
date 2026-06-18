/**
 * NPC 对话框组件。
 *
 * DEV-03：对话内容由 npcDialogResolver 根据任务状态解析；
 * DEV-06：支持每日任务 NPC（巡查员），根据每日任务状态显示不同对话。
 *
 * 对话选项触发对应任务动作。
 * 打开对话时玩家移动通过 UI Store inputMode 暂停。
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findNpcById } from '@/game/npc/npcDefinitions';
import { resolveDialog, type DialogActionType } from '@/game/npc/npcDialogResolver';
import { resolveDailyTaskDialog, type DailyTaskDialogAction } from '@/game/npc/dailyTaskDialogResolver';
import { TASK_DEFINITIONS } from '@/game/tasks/taskDefinitions';
import { gameBridge } from '@/game/bridge/GameBridge';
import styles from './NpcDialog.module.css';

/** 每日任务 NPC ID。 */
const DAILY_TASK_NPCS = new Set(['npc_weather_ranger']);

export function NpcDialog() {
  const currentNpcId = useUIStore((s) => s.currentNpcId);
  const setNpcDialogOpen = useUIStore((s) => s.setNpcDialogOpen);
  const tasks = useTaskStore((s) => s.tasks);
  const acceptTask = useTaskStore((s) => s.acceptTask);
  const submitTask = useTaskStore((s) => s.submitTask);

  const dailyTasks = useDailyTaskStore((s) => s.tasks);
  const acceptDailyTask = useDailyTaskStore((s) => s.acceptTask);
  const dailyTaskNpcTasks = useDailyTaskStore((s) => s.getTasksByNpcId);

  // 查找当前 NPC 配置
  const npcDef = currentNpcId ? findNpcById(currentNpcId) : undefined;

  // 是否为每日任务 NPC
  const isDailyTaskNpc = currentNpcId ? DAILY_TASK_NPCS.has(currentNpcId) : false;

  // 查找该 NPC 发布的（原有）任务
  const taskDef = useMemo(
    () => TASK_DEFINITIONS.find((t) => t.giverNpcId === currentNpcId),
    [currentNpcId],
  );

  // 当前（原有）任务状态
  const taskStatus = taskDef ? tasks[taskDef.id]?.status : undefined;

  // 每日任务 NPC 负责的任务列表
  // dailyTasks 是依赖项，确保任务状态变化时重新计算
  const npcDailyTasks = useMemo(
    () => (currentNpcId ? dailyTaskNpcTasks(currentNpcId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNpcId, dailyTaskNpcTasks, dailyTasks],
  );

  // 解析对话内容
  const dialog = useMemo(() => {
    if (!npcDef) return null;

    if (isDailyTaskNpc) {
      return resolveDailyTaskDialog(
        npcDef.displayName,
        npcDef.role,
        npcDef.id,
        npcDailyTasks,
      );
    }

    // 原有任务 NPC
    const status = taskStatus ?? 'available';
    return resolveDialog(npcDef.displayName, npcDef.role, status);
  }, [npcDef, isDailyTaskNpc, npcDailyTasks, taskStatus]);

  // 关闭对话
  const closeDialog = useCallback(() => {
    const npcId = currentNpcId;
    setNpcDialogOpen(false);
    if (npcId) {
      gameBridge.emit('NPC_DIALOG_CLOSE', { npcId });
    }
  }, [currentNpcId, setNpcDialogOpen]);

  // 处理原有任务选项
  const handleLegacyOption = (action: DialogActionType) => {
    switch (action) {
      case 'accept_task': {
        if (taskDef) {
          const success = acceptTask(taskDef.id);
          if (success) {
            gameBridge.emit('TASK_ACCEPTED', {
              taskId: taskDef.id,
              npcId: taskDef.giverNpcId,
            });
          }
        }
        closeDialog();
        break;
      }
      case 'submit_task': {
        if (taskDef && currentNpcId) {
          const success = submitTask(taskDef.id, currentNpcId);
          if (success) {
            gameBridge.emit('TASK_COMPLETED', {
              taskId: taskDef.id,
              npcId: currentNpcId,
              reward: taskDef.reward,
            });
            gameBridge.emit('TASK_FEEDBACK', {
              message: `任务完成！获得生态点数 ${taskDef.reward.ecoPoints}，声望 ${taskDef.reward.reputation}。`,
            });
          }
        }
        closeDialog();
        break;
      }
      case 'dismiss':
      case 'close':
        closeDialog();
        break;
    }
  };

  // 处理每日任务选项
  const handleDailyTaskOption = (action: DailyTaskDialogAction, taskId?: string) => {
    switch (action) {
      case 'accept_one': {
        if (taskId) {
          acceptDailyTask(taskId);
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
          {isDailyTaskNpc
            ? (dialog.options as { label: string; action: DailyTaskDialogAction; taskId?: string }[]).map((option, idx) => (
                <button
                  key={idx}
                  className={`${styles.optionBtn} ${
                    option.action === 'accept_one' || option.action === 'accept_all'
                      ? styles.optionAccept
                      : styles.optionDefault
                  }`}
                  onClick={() => handleDailyTaskOption(option.action, option.taskId)}
                >
                  {option.label}
                </button>
              ))
            : (dialog.options as { label: string; action: DialogActionType }[]).map((option, idx) => (
                <button
                  key={idx}
                  className={`${styles.optionBtn} ${
                    option.action === 'accept_task'
                      ? styles.optionAccept
                      : option.action === 'submit_task'
                        ? styles.optionSubmit
                        : styles.optionDefault
                  }`}
                  onClick={() => handleLegacyOption(option.action)}
                >
                  {option.label}
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}
