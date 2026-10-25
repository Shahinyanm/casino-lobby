import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { AsyncSection } from '../../ui/AsyncSection';
import { EmptyState, ErrorState } from '../../ui/states';
import styles from './catalog.module.css';
import { applyFilters, hasActiveFilters, type SHOW_CATALOG } from './filters';
import { GameCard } from './GameCard';
import { catalogQuery } from './queries';
import { Toolbar } from './Toolbar';
import { useCatalogFilters } from './useCatalogFilters';

export function CatalogSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Runs after ScrollRestoration, which would otherwise keep the lobby where it was.
    const state = location.state as Partial<typeof SHOW_CATALOG> | null;
    if (navigationType === NavigationType.Pop || !state?.showCatalog) return;

    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: 'start' });
  }, [location, navigationType]);

  return (
    <section ref={ref} id="games" className={styles.section} aria-labelledby="catalog-title" tabIndex={-1}>
      <h2 id="catalog-title">{t('catalog.title')}</h2>
      <AsyncSection
        skeleton={<CatalogSkeleton />}
        error={(retry) => <ErrorState title={t('catalog.errorTitle')} body={t('catalog.errorBody')} onRetry={retry} />}
      >
        <Catalog />
      </AsyncSection>
    </section>
  );
}

function Catalog() {
  const { t, plural } = useI18n();
  const { data } = useSuspenseQuery(catalogQuery);
  const { filters: urlFilters, update, clear } = useCatalogFilters();
  // Provider ids from an old or hand-edited link that no longer exist are ignored, not counted as selected.
  const filters = useMemo(
    () => ({ ...urlFilters, providers: urlFilters.providers.filter((id) => data.providers.some((p) => p.id === id)) }),
    [urlFilters, data.providers],
  );
  const games = useMemo(() => applyFilters(data.games, data.providers, filters), [data, filters]);
  const providerNames = useMemo(() => new Map(data.providers.map((p) => [p.id, p.name])), [data.providers]);
  const active = hasActiveFilters(filters);

  return (
    <>
      <Toolbar filters={filters} providers={data.providers} update={update} />

      <div className={styles.summary}>
        <p aria-live="polite" aria-atomic="true">
          {plural('catalog.results', games.length)}
        </p>
        {active && (
          <button type="button" className={styles.linkButton} onClick={clear}>
            {t('catalog.clearFilters')}
          </button>
        )}
      </div>

      {games.length > 0 ? (
        <ul className={styles.grid}>
          {games.map((game) => (
            <li key={game.id}>
              <GameCard game={game} providerName={providerNames.get(game.providerId) ?? ''} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={t('catalog.emptyTitle')}
          body={t('catalog.emptyBody')}
          action={
            <button type="button" className="btn btn-primary" onClick={clear}>
              {t('catalog.clearFilters')}
            </button>
          }
        />
      )}
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={styles.toolbar}>
        <div className={`skeleton ${styles.skeletonBar}`} />
        <div className={`skeleton ${styles.skeletonBar}`} style={{ inlineSize: '70%' }} />
      </div>
      <ul className={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            <div className={`skeleton ${styles.skeletonMedia}`} />
            <div className={`skeleton ${styles.skeletonLine}`} />
            <div className={`skeleton ${styles.skeletonLine}`} style={{ inlineSize: '50%' }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
