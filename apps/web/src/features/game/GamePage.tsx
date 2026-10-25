import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { AsyncSection } from '../../ui/AsyncSection';
import { Icon } from '../../ui/Icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { SHOW_CATALOG } from '../catalog/filters';
import { catalogQuery } from '../catalog/queries';
import { lastLobbyPath } from '../catalog/useCatalogFilters';
import { FavoriteButton } from '../favorites/FavoriteButton';
import styles from './game.module.css';
import { GamePageSkeleton } from './GamePageSkeleton';

export default function GamePage() {
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      {/* A link, not history.back(): the previous entry may be another game, or another site.
          The filters come back from the URL, the scroll position from ScrollRestoration. */}
      <Link to={lastLobbyPath()} className={styles.back}>
        <Icon name="back" className="flip-rtl" />
        {t('gamePage.back')}
      </Link>
      <AsyncSection
        skeleton={<GamePageSkeleton />}
        error={(retry) => <ErrorState title={t('catalog.errorTitle')} body={t('catalog.errorBody')} onRetry={retry} />}
      >
        <GameDetails />
      </AsyncSection>
    </div>
  );
}

function GameDetails() {
  const { t, money, percent, date } = useI18n();
  const { gameId } = useParams();
  const { data } = useSuspenseQuery(catalogQuery);
  const game = data.games.find((g) => g.id === gameId);

  if (!game) {
    return (
      <EmptyState
        title={t('gamePage.notFoundTitle')}
        body={t('gamePage.notFoundBody')}
        action={
          <Link to="/" className="btn btn-primary">
            {t('notFound.home')}
          </Link>
        }
      />
    );
  }

  const provider = data.providers.find((p) => p.id === game.providerId)?.name ?? '';

  return (
    <article className={styles.layout}>
      <div className={styles.media}>
        <img src={game.thumbnailUrl} alt="" width={400} height={300} />
        <FavoriteButton gameId={game.id} title={game.title} className={styles.favorite} />
      </div>

      <div className={styles.info}>
        <h1 className={styles.title}>{game.title}</h1>
        <p className={styles.provider}>{provider}</p>

        <dl className={styles.facts}>
          <div>
            <dt>{t('gamePage.rtp')}</dt>
            <dd>{percent(game.rtp)}</dd>
          </div>
          <div>
            <dt>{t('gamePage.bets')}</dt>
            <dd>{t('game.bets', { min: money(game.minBetMinor, data.currency), max: money(game.maxBetMinor, data.currency) })}</dd>
          </div>
          <div>
            <dt>{t('gamePage.category')}</dt>
            <dd>{t(`category.${game.category}`)}</dd>
          </div>
          <div>
            <dt>{t('gamePage.released')}</dt>
            <dd>{date(game.releasedAt)}</dd>
          </div>
        </dl>

        <ul className={styles.tags}>
          {game.tags.map((tag) => (
            <li key={tag}>
              <Link to={`/?tag=${tag}`} state={SHOW_CATALOG}>
                {t(`tag.${tag}`)}
              </Link>
            </li>
          ))}
        </ul>

        <button type="button" className="btn btn-primary" disabled aria-describedby="demo-note">
          {t('gamePage.play')}
        </button>
        <p id="demo-note" className={styles.note}>
          {t('gamePage.demoNote')}
        </p>
      </div>
    </article>
  );
}
