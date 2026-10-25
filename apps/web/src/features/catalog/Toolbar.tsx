import type { GameTag, Provider } from '@lobby/contracts';
import { useCallback, useId, useState } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { Icon } from '../../ui/Icon';
import styles from './catalog.module.css';
import { CATEGORIES, parseFilters, SORTS, TAGS, type Filters } from './filters';
import { SearchBox } from './SearchBox';

interface Props {
  filters: Filters;
  providers: Provider[];
  update: (patch: Partial<Filters>, options?: { replace?: boolean }) => void;
}

const toggle = <T,>(list: readonly T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function Toolbar({ filters, providers, update }: Props) {
  const { t, plural } = useI18n();
  const [providersOpen, setProvidersOpen] = useState(filters.providers.length > 0);
  const sortId = useId();
  const panelId = useId();
  const location = useLocation();
  const navigationType = useNavigationType();
  // Starting a search adds a history entry, so Back clears it; refining it replaces that entry.
  const commitSearch = useCallback(
    (q: string) => update({ q }, { replace: parseFilters(window.location.search).q !== '' }),
    [update],
  );
  // Only the toolbar's own changes keep a half-typed search. Back/Forward, the logo, the palette,
  // promos and Clear filters replace it.
  const keepSearch =
    navigationType !== NavigationType.Pop && (location.state as { keepSearch?: boolean } | null)?.keepSearch === true;
  const searchReset = keepSearch ? undefined : location.key;

  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <SearchBox value={filters.q} resetKey={searchReset} onCommit={commitSearch} />
        <div className={styles.sort}>
          <label htmlFor={sortId} className={styles.sortLabel}>
            {t('catalog.sort')}
          </label>
          <select
            id={sortId}
            className="field"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`sort.${sort}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className={styles.segmented}>
        <legend className="sr-only">{t('catalog.category')}</legend>
        {CATEGORIES.map((category) => (
          <label key={category} className={styles.segment}>
            <input
              type="radio"
              name="category"
              value={category}
              checked={filters.category === category}
              onChange={() => update({ category })}
            />
            <span>{t(`category.${category}`)}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.chipRow}>
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={providersOpen}
          aria-controls={panelId}
          aria-label={
            filters.providers.length
              ? plural('catalog.providersSelected', filters.providers.length)
              : t('catalog.providers')
          }
          onClick={() => setProvidersOpen((open) => !open)}
        >
          {t('catalog.providers')}
          {filters.providers.length > 0 && <span className={styles.count}>{filters.providers.length}</span>}
          <Icon name="chevron" className={styles.disclosureIcon} />
        </button>

        <ul className={styles.tagList} aria-label={t('catalog.tags')}>
          {TAGS.map((tag: GameTag) => (
            <li key={tag}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={filters.tags.includes(tag)}
                onClick={() => update({ tags: toggle(filters.tags, tag) })}
              >
                {t(`tag.${tag}`)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <fieldset id={panelId} className={styles.providerPanel} hidden={!providersOpen}>
        <legend className="sr-only">{t('catalog.providers')}</legend>
        {providers.map((provider) => (
          <label key={provider.id} className={styles.checkChip}>
            <input
              type="checkbox"
              checked={filters.providers.includes(provider.id)}
              onChange={() => update({ providers: toggle(filters.providers, provider.id) })}
            />
            <span>{provider.name}</span>
          </label>
        ))}
        {filters.providers.length > 0 && (
          <button type="button" className={styles.linkButton} onClick={() => update({ providers: [] })}>
            {t('catalog.providersClear')}
          </button>
        )}
      </fieldset>
    </div>
  );
}
