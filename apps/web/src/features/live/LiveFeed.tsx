import type { Win } from '@lobby/contracts';
import { memo, useEffect, useId, useState, type CSSProperties, type FocusEvent } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useMediaQuery, useNow } from '../../lib/hooks';
import { useStore } from '../../lib/store';
import { Icon } from '../../ui/Icon';
import { liveFeed } from './live-connection';
import styles from './live.module.css';

const VISIBLE_WINS = 12;

/**
 * Subscribes to the feed store on its own: a new win re-renders this list only, never the catalog.
 * Pauses on hover, while focus is inside the list, when collapsed on mobile and when the tab is hidden.
 */
export function LiveFeed() {
  const { t, plural } = useI18n();
  const { wins, pending, status, pausedBy } = useStore(liveFeed.store);
  const compact = useMediaQuery('(max-width: 63.99rem)');
  const [open, setOpen] = useState(false);
  const listId = useId();
  const expanded = !compact || open;
  const manual = pausedBy.includes('manual');
  const paused = pausedBy.some((reason) => reason !== 'hidden' && reason !== 'collapsed');

  useEffect(() => {
    liveFeed.setPaused('collapsed', !expanded);
  }, [expanded]);

  // Leaving the page from inside the list (a click on a game) fires no pointerleave or blur.
  useEffect(
    () => () => {
      liveFeed.setPaused('hover', false);
      liveFeed.setPaused('focus', false);
    },
    [],
  );

  const onBlur = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) liveFeed.setPaused('focus', false);
  };

  const statusLabel = paused ? t('live.paused') : t(`live.${status}`);

  return (
    <section className={styles.feed} aria-labelledby="live-title">
      <div className={styles.head}>
        <h2 id="live-title" className={styles.title}>
          {t('live.title')}
        </h2>
        <span className={styles.status} data-status={paused ? 'paused' : status}>
          {statusLabel}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label={t(manual ? 'live.resume' : 'live.pause')}
          onClick={() => liveFeed.setPaused('manual', !manual)}
        >
          <Icon name={manual ? 'play' : 'pause'} />
        </button>
        {compact && (
          <button
            type="button"
            className="icon-btn"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t(open ? 'live.hide' : 'live.show')}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="chevron" className={open ? styles.chevronOpen : styles.chevronClosed} />
          </button>
        )}
      </div>

      {pending.length > 0 && expanded && (
        <p className={styles.waiting}>{plural('live.waiting', pending.length)}</p>
      )}

      {/* Hover-pause is a mouse convenience. Keyboard users get the same via focus and the Pause button. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        id={listId}
        hidden={!expanded}
        className={styles.body}
        onPointerEnter={(e) => e.pointerType === 'mouse' && liveFeed.setPaused('hover', true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && liveFeed.setPaused('hover', false)}
        onFocus={() => liveFeed.setPaused('focus', true)}
        onBlur={onBlur}
      >
        {status === 'connecting' && wins.length === 0 ? (
          <FeedSkeleton />
        ) : wins.length === 0 ? (
          <p className={styles.empty}>{t('live.empty')}</p>
        ) : (
          <WinList wins={wins} />
        )}
      </div>
    </section>
  );
}

const WinList = memo(function WinList({ wins }: { wins: readonly Win[] }) {
  const { money, relative } = useI18n();
  const now = useNow();

  return (
    <ol className={styles.list}>
      {wins.slice(0, VISIBLE_WINS).map((win) => (
        <li key={win.id} className={styles.item}>
          <span className={styles.avatar} style={{ '--hue': win.avatarHue } as CSSProperties} aria-hidden="true">
            {win.player.charAt(0)}
          </span>
          <bdi className={styles.player}>{win.player}</bdi>
          <span className={styles.amount}>{money(win.amountMinor, win.currency)}</span>
          <Link to={`/games/${win.gameId}`} className={styles.game}>
            <bdi>{win.gameTitle}</bdi>
          </Link>
          <time className={styles.time} dateTime={win.at}>
            {relative(win.at, Math.max(now, Date.parse(win.at)))}
          </time>
        </li>
      ))}
    </ol>
  );
});

function FeedSkeleton() {
  return (
    <div className={styles.list} aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.item}>
          <span className={`skeleton ${styles.avatar}`} />
          <span className={`skeleton ${styles.skeletonLine}`} />
          <span className={`skeleton ${styles.skeletonLineShort}`} />
        </div>
      ))}
    </div>
  );
}
