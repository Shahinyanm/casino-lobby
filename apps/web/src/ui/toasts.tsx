import { useI18n } from '../i18n/I18nProvider';
import type { I18n } from '../i18n/i18n';
import { createStore, useStore } from '../lib/store';
import { Icon } from './Icon';
import styles from './toasts.module.css';

interface Toast {
  id: number;
  kind: 'success' | 'error';
  /** Rendered with the current locale, so switching language translates toasts already on screen. */
  message: (i18n: I18n) => string;
}

const toasts = createStore<Toast[]>([]);
const SUCCESS_TTL_MS = 5000;
const MAX_TOASTS = 4;
let nextId = 1;

export function dismissToast(id: number) {
  toasts.set((list) => list.filter((toast) => toast.id !== id));
}

/** Success toasts fade on their own; errors stay until dismissed, because they explain a rollback. */
export function showToast(kind: Toast['kind'], message: Toast['message']) {
  const id = nextId++;
  toasts.set((list) => [...list, { id, kind, message }].slice(-MAX_TOASTS));

  if (kind === 'success') setTimeout(() => dismissToast(id), SUCCESS_TTL_MS);
}

export function Toaster() {
  const list = useStore(toasts);
  const i18n = useI18n();

  // The live region is always in the DOM: screen readers often miss one that is inserted together with its text.
  return (
    <ol className={styles.region} aria-live="polite">
      {list.map((toast) => (
        <li key={toast.id} className={styles.toast} data-kind={toast.kind}>
          <Icon name={toast.kind === 'error' ? 'alert' : 'check'} className={styles.icon} />
          <p className={styles.message}>{toast.message(i18n)}</p>
          <button
            type="button"
            className={styles.dismiss}
            aria-label={i18n.t('toast.dismiss')}
            onClick={() => dismissToast(toast.id)}
          >
            <Icon name="close" />
          </button>
        </li>
      ))}
    </ol>
  );
}
