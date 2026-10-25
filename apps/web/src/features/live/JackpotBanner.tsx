import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../lib/store';
import { AnimatedMoney } from '../../ui/AnimatedMoney';
import { SHOW_CATALOG } from '../catalog/filters';
import { liveFeed } from './live-connection';
import styles from './jackpot.module.css';

// Matches the server's tick: interpolating over exactly one interval makes the count look continuous.
const JACKPOT_TICK_MS = 2000;

export function JackpotBanner() {
  const { t, money } = useI18n();
  const jackpotMinor = useStore(liveFeed.store, (s) => s.jackpotMinor);

  return (
    <section className={styles.banner} aria-labelledby="jackpot-title">
      <h2 id="jackpot-title" className={styles.title}>
        {t('jackpot.title')}
      </h2>

      {jackpotMinor === null ? (
        <p className={styles.amount}>
          <span className={`skeleton ${styles.skeleton}`} />
          <span className="sr-only">{t('jackpot.connecting')}</span>
        </p>
      ) : (
        <p className={styles.amount}>
          <AnimatedMoney minor={jackpotMinor} currency="USD" durationMs={JACKPOT_TICK_MS} easing="linear" />
          <span className="sr-only">{money(jackpotMinor, 'USD')}</span>
        </p>
      )}

      <p className={styles.caption}>{t('jackpot.caption')}</p>
      <Link to="/?tag=jackpot" state={SHOW_CATALOG} className={`btn btn-primary ${styles.cta}`}>
        {t('jackpot.cta')}
      </Link>
    </section>
  );
}
