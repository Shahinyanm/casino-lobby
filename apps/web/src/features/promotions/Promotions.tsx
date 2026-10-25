import type { Promotion } from '@lobby/contracts';
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { api } from '../../lib/api';
import { prefersReducedMotion, useNow } from '../../lib/hooks';
import { Icon } from '../../ui/Icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { SHOW_CATALOG } from '../catalog/filters';
import styles from './promotions.module.css';

const promotionsQuery = (locale: string) =>
  queryOptions({
    queryKey: ['promotions', locale],
    queryFn: ({ signal }) => api<Promotion[]>(`/promotions?locale=${locale}`, { signal }),
  });

/**
 * Promo copy is content, localized by the server. Not suspense-driven on purpose: switching
 * language keeps the old cards on screen until the new ones arrive instead of flashing a skeleton.
 */
export function Promotions() {
  const { t, locale } = useI18n();
  const query = useQuery({ ...promotionsQuery(locale), placeholderData: keepPreviousData });

  return (
    <section className={styles.section} aria-labelledby="promos-title">
      <h2 id="promos-title">{t('promos.title')}</h2>
      {query.isPending ? (
        <PromotionsSkeleton />
      ) : query.isError ? (
        <ErrorState title={t('promos.error')} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title={t('promos.empty')} />
      ) : (
        <Scroller promotions={query.data} />
      )}
    </section>
  );
}

/** A real scroll container: native momentum and snap on touch, buttons and wheel on desktop. */
function Scroller({ promotions }: { promotions: Promotion[] }) {
  const { t, relative, dir } = useI18n();
  const now = useNow();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // In RTL scrollLeft runs from 0 to negative values; the distance from the start is the same.
    const position = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: position <= 1, end: position >= max - 1 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure, promotions]);

  const page = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;

    const delta = direction * el.clientWidth * 0.85 * (dir === 'rtl' ? -1 : 1);
    el.scrollBy({ left: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <div className={styles.wrap}>
      {/* Focusable so keyboard users can scroll it with arrow keys (axe: scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={ref} className={styles.scroller} role="region" aria-label={t('promos.region')} tabIndex={0}>
        <ul className={styles.track}>
          {promotions.map((promo) => (
            // dir="auto": while new-language copy loads, the old cards keep their own text direction.
            <li key={promo.id} dir="auto" className={styles.card} style={{ '--promo-h': promo.hue } as CSSProperties}>
              <h3 className={styles.cardTitle}>{promo.title}</h3>
              <p className={styles.cardBody}>{promo.description}</p>
              <p className={styles.cardEnds}>{t('promos.endsIn', { when: relative(promo.endsAt, now) })}</p>
              <Link to={promo.href} state={SHOW_CATALOG} className={styles.cardCta}>
                {promo.cta}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.nav}>
        <button type="button" className="icon-btn" aria-label={t('promos.previous')} disabled={edges.start} onClick={() => page(-1)}>
          <Icon name="chevron" className={`flip-rtl ${styles.prevIcon}`} />
        </button>
        <button type="button" className="icon-btn" aria-label={t('promos.next')} disabled={edges.end} onClick={() => page(1)}>
          <Icon name="chevron" className="flip-rtl" />
        </button>
      </div>
    </div>
  );
}

function PromotionsSkeleton() {
  return (
    <div className={styles.track} aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={`skeleton ${styles.skeletonCard}`} />
      ))}
    </div>
  );
}
