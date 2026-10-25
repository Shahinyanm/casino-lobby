import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { DEFAULT_FILTERS, parseFilters, serializeFilters, type Filters } from './filters';

let lastSearch = '';

/** History state of the toolbar's own changes: the search box keeps what is still being typed (see Toolbar). */
const KEEP_SEARCH = { keepSearch: true };

/** The catalog view the player saw last, for "Back to the lobby" on a game page. */
export const lastLobbyPath = () => `/${lastSearch}`;

/**
 * Filters are read from and written to the URL; there is no second copy in React state to drift.
 * Discrete changes push a history entry (Back undoes them); refining a search replaces it (no entry per keystroke).
 */
export function useCatalogFilters() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const filters = useMemo(() => parseFilters(search), [search]);

  useEffect(() => {
    lastSearch = search;
  }, [search]);

  const update = useCallback(
    (patch: Partial<Filters>, options: { replace?: boolean; keepSearch?: boolean } = {}) => {
      // Read the live URL, not the render-time copy: two quick updates must not overwrite each other.
      const next = serializeFilters({ ...parseFilters(window.location.search), ...patch });
      // flushSync: controlled inputs read the URL, so it must commit before paint, not in a transition.
      void navigate(
        { pathname: '/', search: next ? `?${next}` : '' },
        {
          replace: options.replace,
          state: options.keepSearch === false ? null : KEEP_SEARCH,
          preventScrollReset: true,
          flushSync: true,
        },
      );
    },
    [navigate],
  );

  const clear = useCallback(() => {
    update({ ...DEFAULT_FILTERS, sort: parseFilters(window.location.search).sort }, { keepSearch: false });
  }, [update]);

  return { filters, update, clear };
}
