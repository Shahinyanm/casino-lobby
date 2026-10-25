import { useI18n } from '../../i18n/I18nProvider';
import { Icon } from '../../ui/Icon';
import { toggleFavorite, useIsFavorite } from './favorites-store';
import styles from './favorites.module.css';

export function FavoriteButton({ gameId, title, className = '' }: { gameId: string; title: string; className?: string }) {
  const { t } = useI18n();
  const active = useIsFavorite(gameId);

  return (
    <button
      type="button"
      className={`${styles.heart} ${className}`}
      aria-pressed={active}
      aria-label={t('game.favorite', { title })}
      onClick={() => toggleFavorite(gameId)}
    >
      <Icon name="heart" />
    </button>
  );
}
