import type { Category, Game, GameTag, Provider } from '@lobby/contracts';

export type SortKey = 'trending' | 'new' | 'rtp';
export type CategoryFilter = Category | 'all';

/** The whole catalog view. It lives in the URL, so every combination is a shareable link. */
export interface Filters {
  category: CategoryFilter;
  /** Sorted and unique, so equal views have equal URLs */
  providers: string[];
  tags: GameTag[];
  q: string;
  sort: SortKey;
}

export const CATEGORIES: CategoryFilter[] = ['all', 'slots', 'table', 'live'];
export const SORTS: SortKey[] = ['trending', 'new', 'rtp'];
export const TAGS: GameTag[] = ['jackpot', 'megaways', 'bonus-buy', 'hot', 'classic', 'high-volatility', 'vip', 'low-stakes'];

export const DEFAULT_FILTERS: Filters = { category: 'all', providers: [], tags: [], q: '', sort: 'trending' };

/**
 * Navigation state for links that filter the catalog from elsewhere (jackpot, promos, palette).
 * Filter clicks keep the scroll position; these links bring the results into view instead.
 */
export const SHOW_CATALOG = { showCatalog: true } as const;

const MAX_QUERY_LENGTH = 100;
const ID_PATTERN = /^[a-z0-9-]+$/;

const oneOf = <T extends string>(allowed: readonly T[], value: string | null, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const list = (value: string | null) => [...new Set((value ?? '').split(',').map((v) => v.trim()))].sort();

export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);

  return {
    category: oneOf(CATEGORIES, params.get('category'), DEFAULT_FILTERS.category),
    providers: list(params.get('provider')).filter((id) => ID_PATTERN.test(id)),
    tags: list(params.get('tag')).filter((tag): tag is GameTag => TAGS.includes(tag as GameTag)),
    q: (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    sort: oneOf(SORTS, params.get('sort'), DEFAULT_FILTERS.sort),
  };
}

/** Canonical query string without "?": fixed key order, defaults omitted, readable commas instead of %2C. */
export function serializeFilters(filters: Filters): string {
  const parts: string[] = [];
  // Sorted here too: a toggled-on value arrives appended, and order must not change the link.
  const encodeList = (values: string[]) => [...new Set(values)].sort().map(encodeURIComponent).join(',');

  if (filters.category !== DEFAULT_FILTERS.category) parts.push(`category=${filters.category}`);
  if (filters.providers.length) parts.push(`provider=${encodeList(filters.providers)}`);
  if (filters.tags.length) parts.push(`tag=${encodeList(filters.tags)}`);
  if (filters.q) parts.push(`q=${encodeURIComponent(filters.q)}`);
  if (filters.sort !== DEFAULT_FILTERS.sort) parts.push(`sort=${filters.sort}`);

  return parts.join('&');
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.category !== 'all' || filters.providers.length > 0 || filters.tags.length > 0 || filters.q !== ''
  );
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const COMPARATORS: Record<SortKey, (a: Game, b: Game) => number> = {
  trending: (a, b) => b.popularity - a.popularity,
  new: (a, b) => b.releasedAt.localeCompare(a.releasedAt),
  rtp: (a, b) => b.rtp - a.rtp,
};

/**
 * Filter groups combine with AND, values inside a group with OR. Search matches every word
 * against title + provider name. Ties fall back to title so the order never jumps between renders.
 */
export function applyFilters(games: readonly Game[], providers: readonly Provider[], filters: Filters): Game[] {
  const providerNames = new Map(providers.map((p) => [p.id, p.name]));
  const words = normalize(filters.q).split(/\s+/).filter(Boolean);
  const byProvider = new Set(filters.providers);
  const byTag = new Set<string>(filters.tags);
  const compare = COMPARATORS[filters.sort];

  return games
    .filter((game) => {
      if (filters.category !== 'all' && game.category !== filters.category) return false;
      if (byProvider.size && !byProvider.has(game.providerId)) return false;
      if (byTag.size && !game.tags.some((tag) => byTag.has(tag))) return false;
      if (!words.length) return true;

      const haystack = normalize(`${game.title} ${providerNames.get(game.providerId) ?? ''}`);
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => compare(a, b) || a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id));
}
