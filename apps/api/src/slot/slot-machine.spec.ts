import { describe, expect, it } from 'vitest';
import type { SlotSymbol } from '@lobby/contracts';
import { ADVERTISED_RTP, multiplierFor, REELS, symbolsAt } from './slot-machine';

describe('slot machine', () => {
  it('returns exactly the advertised RTP over every combination of stops', () => {
    const [first = [], second = [], third = []] = REELS;
    let paid = 0;

    for (let a = 0; a < first.length; a++) {
      for (let b = 0; b < second.length; b++) {
        for (let c = 0; c < third.length; c++) paid += multiplierFor(symbolsAt([a, b, c]));
      }
    }

    expect((paid / (first.length * second.length * third.length)) * 100).toBe(ADVERTISED_RTP);
  });

  it('puts the same symbols on every reel, only in a different order', () => {
    const counts = (reel: SlotSymbol[]) => [...reel].sort().join();

    expect(REELS).toHaveLength(3);
    expect(new Set(REELS.map(counts)).size).toBe(1);
    expect(REELS[0]?.filter((s) => s === 'seven')).toHaveLength(1);
  });

  it.each<[SlotSymbol[], number]>([
    [['seven', 'seven', 'seven'], 200],
    [['cherry', 'cherry', 'cherry'], 6],
    [['cherry', 'bell', 'cherry'], 2],
    [['bar', 'bar', 'bell'], 0],
    [['cherry', 'lemon', 'bell'], 0],
  ])('%j pays %i× the bet', (symbols, multiplier) => {
    expect(multiplierFor(symbols)).toBe(multiplier);
  });
});
