import { createContext, use, useEffect, useMemo, type ReactNode } from 'react';
import { preferences } from '../app/preferences';
import { useStore } from '../lib/store';
import { createI18n, type I18n } from './i18n';

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useStore(preferences, (p) => p.locale);
  const i18n = useMemo(() => createI18n(locale), [locale]);

  useEffect(() => {
    document.title = i18n.t('app.documentTitle');
  }, [i18n]);

  return <I18nContext value={i18n}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const i18n = use(I18nContext);
  if (!i18n) throw new Error('useI18n must be used inside <I18nProvider>');
  return i18n;
}
