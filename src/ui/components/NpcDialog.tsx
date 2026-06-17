import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import type { NpcDialogSummary } from '@/types';
import styles from './NpcDialog.module.css';

// 占位 NPC 对话数据
const PLACEHOLDER_DIALOG: NpcDialogSummary = {
  npcId: 'npc.environmental_monitor',
  npcName: '环境监测员',
  npcRole: '环境监测',
  lines: [
    '欢迎来到雾港旧工业区。',
    '这里的生态状况不容乐观，我们需要你的帮助。',
    '请先查看任务面板，了解当前的修复工作。',
  ],
  hasTask: true,
};

export function NpcDialog() {
  const setNpcDialogOpen = useUIStore((s) => s.setNpcDialogOpen);
  const [lineIndex, setLineIndex] = useState(0);

  const handleContinue = () => {
    if (lineIndex < PLACEHOLDER_DIALOG.lines.length - 1) {
      setLineIndex(lineIndex + 1);
    } else {
      setNpcDialogOpen(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => setNpcDialogOpen(false)}>
      <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <div className={styles.npcInfo}>
            <div className={styles.npcAvatar}>👤</div>
            <div>
              <div className={styles.npcName}>{PLACEHOLDER_DIALOG.npcName}</div>
              <div className={styles.npcRole}>{PLACEHOLDER_DIALOG.npcRole}</div>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => setNpcDialogOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className={styles.dialogBody}>
          <p className={styles.dialogLine}>{PLACEHOLDER_DIALOG.lines[lineIndex]}</p>
        </div>
        <div className={styles.dialogFooter}>
          <button className={styles.continueBtn} onClick={handleContinue}>
            {lineIndex < PLACEHOLDER_DIALOG.lines.length - 1 ? '继续' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}
