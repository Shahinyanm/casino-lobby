import { useEffect, useId, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { Icon } from '../../ui/Icon';
import styles from './catalog.module.css';

const DEBOUNCE_MS = 250;

interface Props {
  value: string;
  /** Changes when an outside navigation must replace the text even though `value` stayed the same */
  resetKey?: string;
  onCommit: (q: string) => void;
}

/**
 * Local text for instant typing, URL for the committed query. The tricky part is telling our own
 * debounced write coming back ("echo") from an outside change (Back button, palette, Clear filters):
 * only the latter may overwrite what the player is typing. Before the first commit `value` is empty
 * both before and after such a change, so those navigations also pass a new `resetKey`.
 */
export function SearchBox({ value, resetKey, onCommit }: Props) {
  const { t } = useI18n();
  const id = useId();
  const [text, setText] = useState(value);
  const [sent, setSent] = useState(value);
  const [seenValue, setSeenValue] = useState(value);
  const [seenReset, setSeenReset] = useState(resetKey);

  if (value !== seenValue || resetKey !== seenReset) {
    const reset = resetKey !== undefined && resetKey !== seenReset;
    setSeenValue(value);
    setSeenReset(resetKey);
    // Setting `sent` to the URL value also cancels a pending debounced commit.
    if (reset || value !== sent) {
      setSent(value);
      setText(value);
    }
  }

  useEffect(() => {
    const q = text.trim();
    if (q === sent) return;

    const timer = setTimeout(() => {
      setSent(q);
      onCommit(q);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, sent, onCommit]);

  const commitNow = (q: string) => {
    setText(q);
    setSent(q.trim());
    onCommit(q.trim());
  };

  return (
    <div className={styles.search} role="search">
      <label htmlFor={id} className="sr-only">
        {t('catalog.searchLabel')}
      </label>
      <Icon name="search" className={styles.searchIcon} />
      <input
        id={id}
        className={`field ${styles.searchInput}`}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={100}
        placeholder={t('catalog.searchPlaceholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitNow(text);
        }}
      />
      {text && (
        <button type="button" className={styles.searchClear} aria-label={t('catalog.searchClear')} onClick={() => commitNow('')}>
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}
