import { describe, expect, it } from 'vitest';
import { isLiveMessage } from './live-connection';

const win = {
  id: 'w1',
  player: 'Ana',
  avatarHue: 120,
  gameId: 'golden-reels',
  gameTitle: 'Golden Reels',
  amountMinor: 2500,
  currency: 'USD',
  at: '2026-10-24T10:00:00Z',
};

describe('isLiveMessage', () => {
  it.each([
    ['a win', { type: 'win', win }],
    ['a jackpot tick', { type: 'jackpot', jackpotMinor: 1_000_000 }],
    ['a snapshot', { type: 'snapshot', jackpotMinor: 1_000_000, wins: [win] }],
  ])('accepts %s', (_label, message) => {
    expect(isLiveMessage(message)).toBe(true);
  });

  it.each([
    ['a win without its payload', { type: 'win' }],
    ['a win with a date that is not one', { type: 'win', win: { ...win, at: 'yesterday' } }],
    ['a win in an unknown currency', { type: 'win', win: { ...win, currency: 'XYZ' } }],
    ['a jackpot that is not a number', { type: 'jackpot', jackpotMinor: '12' }],
    ['a snapshot with one broken win', { type: 'snapshot', jackpotMinor: 1, wins: [win, { ...win, amountMinor: null }] }],
    ['an unknown type', { type: 'chat', text: 'hi' }],
    ['null', null],
  ])('drops %s', (_label, message) => {
    expect(isLiveMessage(message)).toBe(false);
  });
});
