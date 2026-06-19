import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { usePlayerStore } from '@/store/playerStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import type { PlayerCharacterGender } from '@/types';
import styles from './CharacterSelectPage.module.css';

export function CharacterSelectPage() {
  const setPage = useUIStore((s) => s.setPage);
  const selectCharacter = usePlayerStore((s) => s.selectCharacter);
  const existingCharacter = usePlayerStore((s) => s.character);
  const [selected, setSelected] = useState<PlayerCharacterGender | null>(null);

  const handleConfirm = () => {
    if (!selected) return;

    // 如果已有角色且切换了性别，触发任务/区域重置（策略 A：角色独立存档）
    if (existingCharacter && existingCharacter.gender !== selected) {
      // 先设置新角色
      selectCharacter(selected);
      // 重置每日任务和区域状态（onCharacterChange 内部会重置 environmentStore）
      useDailyTaskStore.getState().onCharacterChange();
    } else {
      selectCharacter(selected);
    }
    setPage('game');
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>选择生态修复员</h2>
      <div className={styles.cards}>
        <div
          className={`${styles.card} ${selected === 'male' ? styles.cardSelected : ''}`}
          onClick={() => setSelected('male')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSelected('male');
          }}
        >
          <div className={styles.avatar}>♂</div>
          <span className={styles.cardName}>男性修复员</span>
          <span className={styles.cardDesc}>男性生态修复员占位角色</span>
        </div>
        <div
          className={`${styles.card} ${selected === 'female' ? styles.cardSelected : ''}`}
          onClick={() => setSelected('female')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSelected('female');
          }}
        >
          <div className={styles.avatar}>♀</div>
          <span className={styles.cardName}>女性修复员</span>
          <span className={styles.cardDesc}>女性生态修复员占位角色</span>
        </div>
      </div>
      {existingCharacter && (
        <p className={styles.notice}>
          当前角色：{existingCharacter.displayName}。切换角色将开始新的存档，
          每日任务和区域修复进度将重置。
        </p>
      )}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={() => setPage('start')}>
          返回
        </button>
        <button
          className={styles.btnPrimary}
          onClick={handleConfirm}
          disabled={!selected}
        >
          进入主场景
        </button>
      </div>
    </div>
  );
}
