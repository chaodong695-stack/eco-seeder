import styles from './ErrorState.module.css';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.icon}>⚠</div>
        <h3 className={styles.title}>出错了</h3>
        <p className={styles.message}>{message}</p>
        {onRetry && (
          <button className={styles.retryBtn} onClick={onRetry}>
            重试
          </button>
        )}
      </div>
    </div>
  );
}
