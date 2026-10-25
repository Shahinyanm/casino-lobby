import { useI18n } from '../../i18n/I18nProvider';
import { CatalogSection } from '../catalog/CatalogSection';
import { FavoritesRow } from '../favorites/FavoritesRow';
import { JackpotBanner } from '../live/JackpotBanner';
import { LiveFeed } from '../live/LiveFeed';
import { Promotions } from '../promotions/Promotions';
import { SlotGame } from '../slot/SlotGame';
import { WalletCard } from '../wallet/WalletCard';
import styles from './lobby.module.css';

export function LobbyPage() {
  const { t } = useI18n();

  return (
    <div className={styles.lobby}>
      <h1 className="sr-only">{t('app.documentTitle')}</h1>
      <div className={styles.hero}>
        <JackpotBanner />
      </div>
      <div className={styles.promos}>
        <Promotions />
      </div>
      <aside className={styles.aside} aria-label={t('lobby.sidebar')}>
        <WalletCard />
        <LiveFeed />
      </aside>
      <div className={styles.slot}>
        <SlotGame />
      </div>
      <div className={styles.favorites}>
        <FavoritesRow />
      </div>
      <div className={styles.catalog}>
        <CatalogSection />
      </div>
    </div>
  );
}
