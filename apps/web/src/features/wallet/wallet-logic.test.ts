import type { Wallet } from '@lobby/contracts';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../lib/api';
import {
  depositDidNotApply,
  holdBackWins,
  newerWallet,
  overlayPendingDeposits,
  parseAmount,
  quoteCredit,
  retryDeposit,
  type PendingDeposit,
} from './wallet-logic';

describe('parseAmount', () => {
  it.each([
    ['25', 2500],
    [' 25.5 ', 2550],
    ['25.05', 2505],
    ['25,50', 2550],
    ['10000', 1_000_000],
    ['1', 100],
  ])('reads %j as %i minor units without floating point', (text, minor) => {
    expect(parseAmount(text)).toEqual({ ok: true, minor });
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['abc', 'format'],
    ['1.234', 'format'],
    ['-5', 'format'],
    ['1e3', 'format'],
    ['0.99', 'min'],
    ['10000.01', 'max'],
  ])('rejects %j with %s', (text, error) => {
    expect(parseAmount(text)).toEqual({ ok: false, error });
  });
});

describe('quoteCredit', () => {
  it('converts with the rate and rounds to the minor unit', () => {
    expect(quoteCredit(5000, 'EUR', { base: 'USD', rates: { USD: 1, EUR: 1.08, GBP: 1.27, ILS: 0.27 } })).toBe(5400);
    expect(quoteCredit(333, 'ILS', { base: 'USD', rates: { USD: 1, EUR: 1.08, GBP: 1.27, ILS: 0.27 } })).toBe(90);
  });
});

describe('depositDidNotApply', () => {
  it.each([
    ['a decline', new ApiRequestError(422, 'DEPOSIT_DECLINED', ''), true],
    ['a request never sent', new ApiRequestError(0, 'OFFLINE', ''), true],
    ['a connection dropped after sending', new ApiRequestError(0, 'NETWORK', ''), false],
    ['a server error', new ApiRequestError(500, 'INTERNAL', ''), false],
    ['a bug in our own code', new TypeError('x'), false],
  ])('%s', (_label, error, expected) => {
    expect(depositDidNotApply(error)).toBe(expected);
  });
});

describe('retryDeposit', () => {
  it('resends an unknown outcome with the same key a few times', () => {
    const dropped = new ApiRequestError(0, 'NETWORK', '');

    expect([0, 1, 2, 3].map((count) => retryDeposit(count, dropped))).toEqual([true, true, true, false]);
    expect(retryDeposit(0, new ApiRequestError(503, 'INTERNAL', ''))).toBe(true);
  });

  it('never resends a deposit that certainly did not go through', () => {
    expect(retryDeposit(0, new ApiRequestError(422, 'DEPOSIT_DECLINED', ''))).toBe(false);
    expect(retryDeposit(0, new ApiRequestError(0, 'OFFLINE', ''))).toBe(false);
  });
});

describe('newerWallet', () => {
  const at = (revision: number, balanceMinor: number): Wallet => ({ currency: 'USD', balanceMinor, revision, transactions: [] });

  it('keeps the newest snapshot whatever order the answers arrive in', () => {
    expect(newerWallet(at(2, 18_000), at(1, 15_000))).toEqual(at(2, 18_000));
    expect(newerWallet(at(1, 15_000), at(2, 18_000))).toEqual(at(2, 18_000));
  });

  it('takes the snapshot when nothing is cached yet', () => {
    expect(newerWallet(undefined, at(1, 15_000))).toEqual(at(1, 15_000));
  });
});

describe('overlayPendingDeposits', () => {
  const wallet: Wallet = {
    currency: 'USD',
    balanceMinor: 10_000,
    revision: 1,
    transactions: [
      { id: 't1', type: 'deposit', amountMinor: 2000, currency: 'USD', createdAt: '2026-10-22T10:00:00Z', reference: 'done' },
    ],
  };

  const pending = (key: string, creditMinor: number): PendingDeposit => ({
    idempotencyKey: key,
    amountMinor: creditMinor,
    currency: 'USD',
    creditMinor,
    startedAt: `2026-10-22T11:00:0${key.length}Z`,
  });

  it('adds in-flight deposits on top of the server balance and list', () => {
    const view = overlayPendingDeposits(wallet, [pending('a', 500), pending('bb', 700)]);

    expect(view.balanceMinor).toBe(11_200);
    expect(view.transactions.map((t) => [t.reference, t.pending])).toEqual([
      ['bb', true],
      ['a', true],
      ['done', undefined],
    ]);
  });

  it('never counts a deposit twice once the server already reports it', () => {
    const view = overlayPendingDeposits(wallet, [pending('done', 2000)]);

    expect(view.balanceMinor).toBe(10_000);
    expect(view.transactions).toHaveLength(1);
  });

  it('does not count a deposit again once newer deposits pushed it out of the recent list', () => {
    const view = overlayPendingDeposits(wallet, [pending('early', 5000)], new Set(['early']));

    expect(view.balanceMinor).toBe(10_000);
    expect(view.transactions).toHaveLength(1);
  });

  it('counts a double-submitted deposit once', () => {
    expect(overlayPendingDeposits(wallet, [pending('a', 500), pending('a', 500)]).balanceMinor).toBe(10_500);
  });

  it('a failed deposit simply stops being pending: nothing to undo', () => {
    expect(overlayPendingDeposits(wallet, [])).toEqual({ ...wallet, transactions: wallet.transactions });
  });
});

describe('holdBackWins', () => {
  const view: Wallet = {
    currency: 'USD',
    balanceMinor: 10_500,
    revision: 3,
    transactions: [
      { id: 'w', type: 'win', amountMinor: 600, currency: 'USD', createdAt: '2026-10-25T10:00:00Z', reference: 'spin' },
      { id: 'b', type: 'bet', amountMinor: 100, currency: 'USD', createdAt: '2026-10-25T10:00:00Z', reference: 'spin' },
    ],
  };

  it('keeps a win off the balance and the list while its reels are still turning', () => {
    const held = holdBackWins(view, new Set(['spin']));

    expect(held.balanceMinor).toBe(9_900);
    expect(held.transactions.map((t) => t.type)).toEqual(['bet']);
  });

  it('takes nothing off for a win the snapshot does not include', () => {
    expect(holdBackWins(view, new Set(['other']))).toBe(view);
  });
});
