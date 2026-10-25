import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useStore } from '../lib/store';
import { Icon } from '../ui/Icon';
import { DEFAULT_ACCENT_HUE, LOCALES, preferences, setAccentHue, setLocale, type Locale } from './preferences';
import styles from './settings.module.css';

/**
 * Native popover: light dismiss, Esc and top-layer stacking come from the browser.
 * Only the position is ours, set when it opens (the header is sticky, so it stays put).
 */
export function SettingsMenu() {
  const { t } = useI18n();
  const { locale, accentHue } = useStore(preferences);
  const popoverId = useId();
  const languageId = useId();
  const accentId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const place = (event: Event) => {
      const button = buttonRef.current;
      if ((event as ToggleEvent).newState !== 'open' || !button) return;

      const rect = button.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      popover.style.insetBlockStart = `${rect.bottom + 8}px`;
      popover.style.left = rtl ? `${Math.max(8, rect.left)}px` : 'auto';
      popover.style.right = rtl ? 'auto' : `${Math.max(8, window.innerWidth - rect.right)}px`;
    };

    popover.addEventListener('beforetoggle', place);
    return () => popover.removeEventListener('beforetoggle', place);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-label={t('header.settings')}
        popoverTarget={popoverId}
      >
        <Icon name="sliders" />
      </button>

      <div ref={popoverRef} id={popoverId} popover="auto" className={styles.popover} aria-label={t('settings.title')} role="dialog">
        <div className={styles.field}>
          <label htmlFor={languageId}>{t('settings.language')}</label>
          <select
            id={languageId}
            className="field"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {LOCALES.map((code) => (
              <option key={code} value={code} lang={code === 'he' ? 'he' : 'en'}>
                {t(`lang.${code}`)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor={accentId}>{t('settings.accent')}</label>
            <span className={styles.swatch} aria-hidden="true" />
          </div>
          <input
            id={accentId}
            className={styles.hue}
            type="range"
            min={0}
            max={359}
            step={1}
            value={accentHue}
            onChange={(e) => setAccentHue(Number(e.target.value))}
          />
          <button
            type="button"
            className="btn btn-quiet"
            disabled={accentHue === DEFAULT_ACCENT_HUE}
            onClick={() => setAccentHue(DEFAULT_ACCENT_HUE)}
          >
            {t('settings.accentReset')}
          </button>
        </div>
      </div>
    </>
  );
}
