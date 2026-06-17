import { useUIStore } from '@/store/uiStore';
import styles from './StartPage.module.css';

export function StartPage() {
  const setPage = useUIStore((s) => s.setPage);

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>生态播种者</h1>
        <p className={styles.subtitle}>城市污染荒地修复计划 · v0.1</p>
      </div>
      <button
        className={styles.startButton}
        onClick={() => setPage('character-select')}
      >
        开始修复
      </button>
      <p className={styles.footer}>M0 工程骨架阶段 · 占位内容</p>
    </div>
  );
}
