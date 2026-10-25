import type { SlotPayout, SlotSymbol } from '@lobby/contracts';

// Every reel: seven ×1, bar ×3, bell ×4, lemon ×6, cherry ×6. Only the order differs.
export const REELS: SlotSymbol[][] = [
  ['seven', 'cherry', 'lemon', 'bell', 'cherry', 'bar', 'lemon', 'cherry', 'bell', 'lemon',
    'cherry', 'bar', 'lemon', 'bell', 'cherry', 'lemon', 'bar', 'cherry', 'bell', 'lemon'],
  ['cherry', 'bell', 'lemon', 'bar', 'cherry', 'lemon', 'seven', 'lemon', 'cherry', 'bell',
    'bar', 'lemon', 'cherry', 'bell', 'lemon', 'cherry', 'bar', 'lemon', 'cherry', 'bell'],
  ['lemon', 'bar', 'cherry', 'bell', 'lemon', 'cherry', 'lemon', 'bell', 'cherry', 'seven',
    'cherry', 'lemon', 'bar', 'bell', 'cherry', 'lemon', 'bar', 'cherry', 'lemon', 'bell'],
];

export const PAYTABLE: SlotPayout[] = [
  { symbol: 'seven', count: 3, multiplier: 200 },
  { symbol: 'bar', count: 3, multiplier: 40 },
  { symbol: 'bell', count: 3, multiplier: 12 },
  { symbol: 'lemon', count: 3, multiplier: 6 },
  { symbol: 'cherry', count: 3, multiplier: 6 },
  { symbol: 'cherry', count: 2, multiplier: 2 },
];

/** 7 664 bets paid back per 8 000 combinations. slot-machine.spec.ts checks it against the paytable. */
export const ADVERTISED_RTP = 95.8;

export const BETS_MINOR = [50, 100, 200, 500];

export const symbolsAt = (stops: readonly number[]) => REELS.map((reel, i) => reel[stops[i] ?? 0] ?? 'seven');

/** The best payout the middle line qualifies for. */
export function multiplierFor(symbols: readonly SlotSymbol[]): number {
  let best = 0;

  for (const { symbol, count, multiplier } of PAYTABLE) {
    if (symbols.filter((s) => s === symbol).length >= count) best = Math.max(best, multiplier);
  }

  return best;
}
