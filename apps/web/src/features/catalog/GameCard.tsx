import type { Game } from '@lobby/contracts';
import { memo } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { FavoriteButton } from '../favorites/FavoriteButton';
import styles from './catalog.module.css';

const NEW_FOR_MS = 30 * 86_400_000;
// Read once per session: "new" must not flicker while the lobby is open, and render stays pure.
const SESSION_START = Date.now();

export const GameCard = memo(function GameCard({ game, providerName }: { game: Game; providerName: string }) {
  const { t, percent, money } = useI18n();
  const isNew = SESSION_START - Date.parse(game.releasedAt) < NEW_FOR_MS;

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <img src={game.thumbnailUrl} alt="" width={400} height={300} loading="lazy" decoding="async" />
        {isNew && <span className={styles.badge}>{t('game.new')}</span>}
      </div>
      <FavoriteButton gameId={game.id} title={game.title} className={styles.favorite} />
      <h3 className={styles.title}>
        <Link to={`/games/${game.id}`} className={styles.link}>
          <bdi>{game.title}</bdi>
        </Link>
      </h3>
      <p className={styles.provider}>{providerName}</p>
      <p className={styles.meta}>
        <span className={styles.rtp}>{t('game.rtp', { value: percent(game.rtp) })}</span>
        <span>{t('game.bets', { min: money(game.minBetMinor, 'USD'), max: money(game.maxBetMinor, 'USD') })}</span>
      </p>
      <ul className={styles.tags}>
        {game.tags.map((tag) => (
          <li key={tag}>{t(`tag.${tag}`)}</li>
        ))}
      </ul>
    </article>
  );
});
