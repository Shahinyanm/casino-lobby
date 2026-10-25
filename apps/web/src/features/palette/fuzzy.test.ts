import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './fuzzy';

const score = (query: string, text: string) => fuzzyMatch(query, text)?.score ?? -Infinity;

const rank = (query: string, texts: string[]) =>
  texts
    .map((text) => ({ text, score: score(query, text) }))
    .filter((r) => r.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.text);

describe('fuzzyMatch', () => {
  it('rejects text that does not contain the query as a subsequence', () => {
    expect(fuzzyMatch('xyz', 'Golden Reels')).toBeNull();
    expect(fuzzyMatch('reelsg', 'Golden Reels')).toBeNull();
  });

  it('ignores case and accents and reports indices in the original text', () => {
    expect(fuzzyMatch('cafe', 'Café Reels')?.indices).toEqual([0, 1, 2, 3]);
  });

  it('matches word initials like an acronym', () => {
    expect(fuzzyMatch('gr', 'Golden Reels')?.indices).toEqual([0, 7]);
  });

  it('ranks exact, then prefix, then word start, then scattered matches', () => {
    expect(rank('craps', ['Live Craps', 'Caribbean Rapids Show', 'Craps'])).toEqual([
      'Craps',
      'Live Craps',
      'Caribbean Rapids Show',
    ]);
  });

  it('prefers a tight run of characters over the same characters spread out', () => {
    expect(score('neon', 'Neon Vault')).toBeGreaterThan(score('neon', 'North East Old Nowhere'));
  });

  it('prefers shorter text when the match is equally good', () => {
    expect(score('koi', 'Golden Koi')).toBeGreaterThan(score('koi', 'Golden Koi Megaways Deluxe Edition'));
  });

  it('ignores spaces in the query so "gold koi" still finds "Golden Koi"', () => {
    expect(fuzzyMatch('gold koi', 'Golden Koi')).not.toBeNull();
  });

  it('still finds a match when jumping to the next word would skip a needed letter', () => {
    expect(fuzzyMatch('sgr', 'Sugar Gems')?.indices).toEqual([0, 2, 4]);
    expect(fuzzyMatch('rylln', 'Royal Lantern')).not.toBeNull();
  });
});
