import { describe, expect, it } from 'vitest';
import { PROVIDERS, generateCatalog } from './catalog.data';

describe('generateCatalog', () => {
  const games = generateCatalog();

  it('is deterministic', () => {
    expect(generateCatalog()).toEqual(games);
  });

  it('has 100 games with unique ids and known providers', () => {
    const providerIds = new Set(PROVIDERS.map((p) => p.id));

    expect(games).toHaveLength(100);
    expect(new Set(games.map((g) => g.id)).size).toBe(100);
    expect(games.every((g) => providerIds.has(g.providerId))).toBe(true);
  });

  it('keeps values in sane ranges', () => {
    for (const g of games) {
      expect(g.rtp).toBeGreaterThanOrEqual(94);
      expect(g.rtp).toBeLessThanOrEqual(99.5);
      expect(g.minBetMinor).toBeLessThan(g.maxBetMinor);
      expect(g.tags.length).toBeGreaterThan(0);
    }
  });
});
