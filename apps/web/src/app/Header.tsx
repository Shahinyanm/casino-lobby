import { Link } from 'react-router';
import { HeaderBalance } from '../features/wallet/HeaderBalance';
import { useI18n } from '../i18n/I18nProvider';
import { useStore } from '../lib/store';
import { Icon } from '../ui/Icon';
import styles from './header.module.css';
import { preferences, toggleTheme } from './preferences';
import { SettingsMenu } from './SettingsMenu';
import { openPalette } from './ui-store';

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Header() {
  const { t } = useI18n();
  const theme = useStore(preferences, (p) => p.theme);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label={t('app.home')}>
          <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.logo}>
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="16" cy="16" r="7" fill="currentColor" />
            <path d="M16 2v5M16 25v5M2 16h5M25 16h5" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <span className={styles.brandName}>{t('app.name')}</span>
        </Link>

        <div className={styles.searchWrap}>
          <button
            type="button"
            className={styles.search}
            aria-label={t('header.searchLabel')}
            aria-keyshortcuts="Control+K Meta+K"
            onClick={openPalette}
          >
            <Icon name="search" />
            <span className={styles.searchText}>{t('header.search')}</span>
          </button>
          {/* Outside the button so its visible text stays a prefix of its accessible name (WCAG 2.5.3). */}
          <kbd className={styles.kbd} aria-hidden="true">
            {t(isMac ? 'header.shortcutMac' : 'header.shortcut')}
          </kbd>
        </div>

        <div className={styles.actions}>
          <HeaderBalance />
          <SettingsMenu />
          <button
            type="button"
            className="icon-btn"
            aria-label={t(theme === 'dark' ? 'header.themeToLight' : 'header.themeToDark')}
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>
    </header>
  );
}
