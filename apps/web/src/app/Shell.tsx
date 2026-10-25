import { useEffect, useSyncExternalStore } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import CommandPalette from '../features/palette/CommandPalette';
import DepositDialog from '../features/wallet/DepositDialog';
import { useI18n } from '../i18n/I18nProvider';
import { useStore } from '../lib/store';
import { Icon } from '../ui/Icon';
import { Toaster } from '../ui/toasts';
import { Header } from './Header';
import styles from './shell.module.css';
import { openPalette, ui } from './ui-store';

// Overlays ship in the main bundle (about 9 KB together). Lazy-loading them made React suspend for
// ~300 ms on the first Ctrl+K, and the keys typed in that window were lost.

const subscribeOnline = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

export function Shell() {
  const { t } = useI18n();
  const { depositOpen, paletteOpen } = useStore(ui);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // On a Hebrew layout the K key reports "ל". The physical key is the fallback only for
      // non-Latin letters, so Ctrl+K stays where Dvorak or AZERTY users expect it.
      const isK = event.key.toLowerCase() === 'k' || (event.code === 'KeyK' && !/^[a-z]$/i.test(event.key));
      if ((event.ctrlKey || event.metaKey) && isK && !event.isComposing) {
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      <Header />
      {!online && (
        <p className={styles.offline} role="status">
          <Icon name="wifiOff" />
          {t('app.offline')}
        </p>
      )}
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Toaster />
      {depositOpen && <DepositDialog />}
      {paletteOpen && <CommandPalette />}
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  );
}
