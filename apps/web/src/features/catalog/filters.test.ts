import type { Game, Provider } from '@lobby/contracts';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, applyFilters, hasActiveFilters, parseFilters, serializeFilters } from './filters';

const providers: Provider[] = [
  { id: 'neon-owl', name: 'Neon Owl' },
  { id: 'copperline', name: 'Copperline' },
  { id: 'velvet-rope', name: 'Velvet Rope Live' },
];

const game = (over: Partial<Game> & Pick<Game, 'id' | 'title'>): Game => ({
  providerId: 'neon-owl',
  category: 'slots',
  tags: [],
  rtp: 96,
  minBetMinor: 10,
  maxBetMinor: 1000,
  popularity: 50,
  releasedAt: '2025-01-01',
  thumbnailUrl: '',
  ...over,
});

const games: Game[] = [
  game({ id: 'golden-koi', title: 'Golden Koi', tags: ['jackpot', 'hot'], popularity: 90, rtp: 95.5, releasedAt: '2026-10-01' }),
  game({ id: 'cafe-reels', title: 'Café Reels', providerId: 'copperline', tags: ['classic'], popularity: 70, rtp: 97.1 }),
  game({ id: 'neon-vault', title: 'Neon Vault', tags: ['megaways'], popularity: 70, rtp: 96.2, releasedAt: '2026-09-01' }),
  game({ id: 'live-roulette', title: 'Live Roulette', providerId: 'velvet-rope', category: 'live', tags: ['vip'], popularity: 95, rtp: 97.3 }),
  game({ id: 'blackjack', title: 'Blackjack Classic', providerId: 'copperline', category: 'table', tags: ['classic', 'hot'], popularity: 10, rtp: 99.4 }),
];

const ids = (list: Game[]) => list.map((g) => g.id);

describe('parseFilters / serializeFilters', () => {
  it('returns defaults for an empty query and serializes defaults to nothing', () => {
    expect(parseFilters('')).toEqual(DEFAULT_FILTERS);
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('');
  });

  it('reads every filter from a deep link', () => {
    expect(parseFilters('?category=slots&provider=neon-owl,copperline&tag=jackpot&q=gold%20koi&sort=rtp')).toEqual({
      category: 'slots',
      providers: ['copperline', 'neon-owl'],
      tags: ['jackpot'],
      q: 'gold koi',
      sort: 'rtp',
    });
  });

  it('ignores junk instead of crashing or producing an impossible view', () => {
    expect(parseFilters('?category=poker&sort=random&provider=,,Bad%20Id,&tag=nope,jackpot&q=%20%20')).toEqual({
      ...DEFAULT_FILTERS,
      tags: ['jackpot'],
    });
  });

  it('produces one canonical, readable URL for the same view', () => {
    const a = serializeFilters(parseFilters('?tag=hot,jackpot,hot&provider=neon-owl,copperline&sort=new&q=book of'));
    const b = serializeFilters(parseFilters('?sort=new&q=book+of&provider=copperline,neon-owl&tag=jackpot,hot'));

    expect(a).toBe('provider=copperline,neon-owl&tag=hot,jackpot&q=book%20of&sort=new');
    expect(b).toBe(a);
  });

  it('keeps the URL canonical when a toggled value arrives appended', () => {
    const view = { ...DEFAULT_FILTERS, providers: ['neon-owl', 'copperline'], tags: ['jackpot' as const, 'hot' as const] };
    expect(serializeFilters(view)).toBe('provider=copperline,neon-owl&tag=hot,jackpot');
  });

  it('round-trips', () => {
    const filters = parseFilters('?category=live&provider=velvet-rope&tag=vip&q=roulette&sort=rtp');
    expect(parseFilters(`?${serializeFilters(filters)}`)).toEqual(filters);
  });
});

describe('applyFilters', () => {
  it('combines groups with AND and values inside a group with OR', () => {
    const result = applyFilters(games, providers, {
      ...DEFAULT_FILTERS,
      providers: ['neon-owl', 'copperline'],
      tags: ['hot', 'classic'],
      category: 'slots',
    });

    expect(ids(result)).toEqual(['golden-koi', 'cafe-reels']);
  });

  it('searches title and provider, ignoring case and accents, every word must match', () => {
    expect(ids(applyFilters(games, providers, { ...DEFAULT_FILTERS, q: 'CAFE' }))).toEqual(['cafe-reels']);
    expect(ids(applyFilters(games, providers, { ...DEFAULT_FILTERS, q: 'velvet roul' }))).toEqual(['live-roulette']);
    expect(ids(applyFilters(games, providers, { ...DEFAULT_FILTERS, q: 'neon koi' }))).toEqual(['golden-koi']);
  });

  it('sorts by trending with a stable title tiebreak', () => {
    expect(ids(applyFilters(games, providers, DEFAULT_FILTERS))).toEqual([
      'live-roulette',
      'golden-koi',
      'cafe-reels',
      'neon-vault',
      'blackjack',
    ]);
  });

  it('sorts by release date and by RTP', () => {
    expect(ids(applyFilters(games, providers, { ...DEFAULT_FILTERS, sort: 'new' })).slice(0, 2)).toEqual([
      'golden-koi',
      'neon-vault',
    ]);
    expect(ids(applyFilters(games, providers, { ...DEFAULT_FILTERS, sort: 'rtp' }))[0]).toBe('blackjack');
  });

  it('does not mutate the input', () => {
    const copy = [...games];
    applyFilters(games, providers, { ...DEFAULT_FILTERS, sort: 'rtp' });
    expect(games).toEqual(copy);
  });
});

describe('hasActiveFilters', () => {
  it('ignores sort, which is a view preference rather than a filter', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'rtp' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, q: 'koi' })).toBe(true);
  });
});
