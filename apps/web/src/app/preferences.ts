import { storage } from '../lib/storage';
import { createStore } from '../lib/store';

export type Theme = 'light' | 'dark';
export type Locale = 'en' | 'he' | 'pseudo';

export interface Preferences {
  theme: Theme;
  accentHue: number;
  locale: Locale;
}

export const DEFAULT_ACCENT_HUE = 85;
export const LOCALES: Locale[] = ['en', 'he', 'pseudo'];

// Same keys as the pre-paint script in index.html.
const KEYS = { theme: 'lobby:theme', accent: 'lobby:accent', locale: 'lobby:locale' } as const;

function readInitial(): Preferences {
  const root = document.documentElement;
  const rawHue = storage.get(KEYS.accent);
  // An empty string would read as hue 0 (red), not as "nothing stored".
  const storedHue = rawHue ? Number(rawHue) : DEFAULT_ACCENT_HUE;
  const storedLocale = storage.get(KEYS.locale);

  return {
    // index.html already resolved stored value vs. system preference.
    theme: root.dataset.theme === 'light' ? 'light' : 'dark',
    accentHue: storedHue >= 0 && storedHue < 360 ? storedHue : DEFAULT_ACCENT_HUE,
    locale: LOCALES.includes(storedLocale as Locale)
      ? (storedLocale as Locale)
      : navigator.language.startsWith('he')
        ? 'he'
        : 'en',
  };
}

export const preferences = createStore<Preferences>(readInitial());

export const toggleTheme = () => {
  preferences.set((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }));
};

export const setAccentHue = (accentHue: number) => {
  preferences.set((p) => ({ ...p, accentHue }));
};

export const setLocale = (locale: Locale) => {
  preferences.set((p) => ({ ...p, locale }));
};

/**
 * Mirrors preferences onto <html>. CSS variables do the re-theming, so React does not re-render for it.
 * Only explicit changes are persisted: until then the theme keeps following the OS.
 */
export function bindPreferencesToDocument() {
  const apply = () => {
    const { theme, accentHue, locale } = preferences.get();
    const root = document.documentElement;

    root.dataset.theme = theme;
    root.style.setProperty('--accent-h', String(accentHue));
    root.lang = locale === 'he' ? 'he' : 'en';
    root.dir = locale === 'he' ? 'rtl' : 'ltr';
  };

  apply();
  let saved = preferences.get();

  return preferences.subscribe(() => {
    const next = preferences.get();

    apply();
    // Per field: switching the language must not pin a theme that is still following the OS.
    if (next.theme !== saved.theme) storage.set(KEYS.theme, next.theme);
    if (next.accentHue !== saved.accentHue) storage.set(KEYS.accent, String(next.accentHue));
    if (next.locale !== saved.locale) storage.set(KEYS.locale, next.locale);
    saved = next;
  });
}
