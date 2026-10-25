import styles from './game.module.css';

export function GamePageSkeleton() {
  return (
    <div className={styles.layout} aria-hidden="true">
      <div className={`skeleton ${styles.media}`} />
      <div className={styles.info}>
        <div className="skeleton" style={{ blockSize: 48, inlineSize: '70%' }} />
        <div className="skeleton" style={{ blockSize: 18, inlineSize: '40%' }} />
        <div className="skeleton" style={{ blockSize: 120 }} />
      </div>
    </div>
  );
}
