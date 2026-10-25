import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Icon } from './Icon';
import styles from './states.module.css';

export function ErrorState({ title, body, onRetry }: { title: string; body?: string; onRetry: () => void }) {
  const { t } = useI18n();

  return (
    <div className={styles.state} role="alert">
      <Icon name="alert" className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      <button type="button" className="btn btn-quiet" onClick={onRetry}>
        {t('common.retry')}
      </button>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={styles.state}>
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      {action}
    </div>
  );
}
