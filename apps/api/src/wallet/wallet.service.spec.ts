import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdempotencyConflictError } from '../common/idempotency';
import { DepositDeclinedError, InsufficientFundsError, WalletService } from './wallet.service';

describe('WalletService.deposit', () => {
  let wallet: WalletService;

  beforeEach(() => {
    wallet = new WalletService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('converts to the wallet currency, credits the balance and prepends the transaction', () => {
    const before = wallet.getWallet().balanceMinor;

    const res = wallet.deposit({ amountMinor: 5000, currency: 'EUR', idempotencyKey: 'k1' });

    expect(res.transaction).toMatchObject({
      type: 'deposit',
      amountMinor: 5400,
      currency: 'USD',
      source: { amountMinor: 5000, currency: 'EUR' },
      reference: 'k1',
    });
    expect(res.wallet.balanceMinor).toBe(before + 5400);
    expect(wallet.getWallet().balanceMinor).toBe(before + 5400);
    expect(wallet.getWallet().transactions[0]).toEqual(res.transaction);
  });

  it('declines amounts ending in 9 and leaves the wallet untouched', () => {
    const before = wallet.getWallet();

    expect(() => wallet.deposit({ amountMinor: 1900, currency: 'USD', idempotencyKey: 'k2' })).toThrow(
      DepositDeclinedError,
    );
    expect(wallet.getWallet()).toEqual(before);
  });

  it('replays the same response for a repeated idempotency key and credits once', () => {
    const before = wallet.getWallet().balanceMinor;

    const first = wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'same' });
    const second = wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'same' });

    expect(second).toEqual(first);
    expect(wallet.getWallet().balanceMinor).toBe(before + 2000);
  });

  it('remembers a key however many deposits follow it, so a late replay still credits once', () => {
    const first = wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'early' });
    for (let i = 0; i < 600; i++) wallet.deposit({ amountMinor: 100, currency: 'USD', idempotencyKey: `k${i}` });
    const balance = wallet.getWallet().balanceMinor;

    const replay = wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'early' });

    expect(replay.transaction).toEqual(first.transaction);
    expect(replay.wallet).toEqual(wallet.getWallet());
    expect(wallet.getWallet().balanceMinor).toBe(balance);
  });

  it('forgets a key after 24 hours, so the memory it takes stays bounded', () => {
    vi.useFakeTimers();
    wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'old' });
    const balance = wallet.getWallet().balanceMinor;

    vi.advanceTimersByTime(23 * 3_600_000);
    wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'old' });
    expect(wallet.getWallet().balanceMinor).toBe(balance);

    vi.advanceTimersByTime(2 * 3_600_000);
    wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'old' });
    expect(wallet.getWallet().balanceMinor).toBe(balance + 2000);
  });

  it('answers with the whole wallet at a newer revision', () => {
    const before = wallet.getWallet().revision;

    const res = wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'snapshot' });

    expect(res.wallet).toEqual(wallet.getWallet());
    expect(res.wallet.revision).toBeGreaterThan(before);
  });

  it('rejects a reused idempotency key with a different payload', () => {
    wallet.deposit({ amountMinor: 2000, currency: 'USD', idempotencyKey: 'reused' });

    expect(() => wallet.deposit({ amountMinor: 3000, currency: 'USD', idempotencyKey: 'reused' })).toThrow(
      IdempotencyConflictError,
    );
  });
});

describe('WalletService.settleSpin', () => {
  it('takes the bet and pays the win in one revision', () => {
    const wallet = new WalletService();
    const before = wallet.getWallet();

    const after = wallet.settleSpin(100, 600, 'spin');

    expect(after.balanceMinor).toBe(before.balanceMinor + 500);
    expect(after.revision).toBe(before.revision + 1);
    expect(after.transactions.slice(0, 2)).toMatchObject([
      { type: 'win', amountMinor: 600, reference: 'spin' },
      { type: 'bet', amountMinor: 100, reference: 'spin' },
    ]);
  });

  it('refuses a bet above the balance and changes nothing', () => {
    const wallet = new WalletService();
    const before = wallet.getWallet();

    expect(() => wallet.settleSpin(before.balanceMinor + 1, 0, 'broke')).toThrow(InsufficientFundsError);
    expect(wallet.getWallet()).toEqual(before);
  });
});
