import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { usePlayerStore } from '@/store/playerStore';
import { resetWorldSession } from '@/game/session/resetWorldSession';
import { playBgmByKey, getAudioManager } from '@/game/audio/audioManager';
import { imageAssets } from '@/game/assets/assetManifest';
import type { PlayerCharacterGender } from '@/types';
import styles from './CharacterSelectPage.module.css';

export function CharacterSelectPage() {
  const setPage = useUIStore((s) => s.setPage);
  const selectCharacter = usePlayerStore((s) => s.selectCharacter);
  const existingCharacter = usePlayerStore((s) => s.character);
  const [selected, setSelected] = useState<PlayerCharacterGender | null>(null);

  const handleSelect = (gender: PlayerCharacterGender) => {
    setSelected(gender);
  };

  const handleConfirm = () => {
    if (!selected) return;

    // 选择角色进入游戏视为新一局 — 统一重置所有世界状态
    // 覆盖：刷新页面后从开始页重新进入、返回开始页后重新进入、切换角色
    // 产品规则：重新从开始页选择角色进入游戏 = 新一局
    selectCharacter(selected);
    resetWorldSession();

    // 用户交互后解锁音频，切换到游戏 BGM
    getAudioManager().unlock();
    getAudioManager().setScene('game');
    playBgmByKey('wasteland');

    setPage('game');
  };

  const handleBack = () => {
    setPage('start');
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgGradient} />
      <div className={styles.content}>
        <h2 className={styles.title}>选择生态修复员</h2>
        <p className={styles.subtitle}>选择你的角色，开始生态修复之旅</p>
        <div className={styles.cards}>
          {/* 男修复员卡片 */}
          <div
            className={`${styles.card} ${selected === 'male' ? styles.cardSelected : ''}`}
            onClick={() => handleSelect('male')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSelect('male');
            }}
          >
            <div className={styles.cardImageWrap}>
              <img
                className={styles.cardImage}
                src={imageAssets.characters.male}
                alt="男性修复员"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {selected === 'male' && (
                <div className={styles.selectedBadge}>✓</div>
              )}
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.cardName}>男性修复员</span>
              <span className={styles.cardDesc}>男性生态修复员</span>
            </div>
          </div>

          {/* 女修复员卡片 */}
          <div
            className={`${styles.card} ${selected === 'female' ? styles.cardSelected : ''}`}
            onClick={() => handleSelect('female')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSelect('female');
            }}
          >
            <div className={styles.cardImageWrap}>
              <img
                className={styles.cardImage}
                src={imageAssets.characters.female}
                alt="女性修复员"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {selected === 'female' && (
                <div className={styles.selectedBadge}>✓</div>
              )}
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.cardName}>女性修复员</span>
              <span className={styles.cardDesc}>女性生态修复员</span>
            </div>
          </div>
        </div>
        {existingCharacter && (
          <p className={styles.notice}>
            当前角色：{existingCharacter.displayName}。重新进入游戏将开始新一局，
            所有任务和区域修复进度将重置为初始状态。
          </p>
        )}
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={handleBack}>
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
    </div>
  );
}
