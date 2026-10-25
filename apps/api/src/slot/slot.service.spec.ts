import { beforeEach, describe, expect, it } from 'vitest';
import type { SlotSymbol } from '@lobby/contracts';
import { IdempotencyConflictError } from '../common/idempotency';
import { InsufficientFundsError, WalletService } from '../wallet/wallet.service';
import { REELS } from './slot-machine';
import { SlotService } from './slot.service';

const stopsAt = (...stops: number[]) => {
  let reel = 0;
  return () => stops[reel++] ?? 0;
};

const line = (...symbols: SlotSymbol[]) => symbols.map((symbol, reel) => REELS[reel]?.indexOf(symbol) ?? -1);
const sevens = line('seven', 'seven', 'seven');

describe('SlotService.spin', () => {
  let wallet: WalletService;
  let slot: SlotService;

  beforeEach(() => {
    wallet = new WalletService();
    slot = new SlotService(wallet);
  });

  it('draws one stop per reel and pays what lands on the middle line', () => {
    const before = wallet.getWallet().balanceMinor;

    const { spin, wallet: after } = slot.spin({ betMinor: 100, idempotencyKey: 'jackpot' }, stopsAt(...sevens));

    expect(spin).toMatchObject({ betMinor: 100, stops: sevens, winMinor: 20_000 });
    expect(after.balanceMinor).toBe(before - 100 + 20_000);
  });

  it('takes only the bet when nothing pays', () => {
    const before = wallet.getWallet().balanceMinor;

    const { spin, wallet: after } = slot.spin({ betMinor: 50, idempotencyKey: 'miss' }, stopsAt(...line('seven', 'bar', 'bell')));

    expect(spin.winMinor).toBe(0);
    expect(after.balanceMinor).toBe(before - 50);
    expect(after.transactions[0]).toMatchObject({ type: 'bet', amountMinor: 50 });
  });

  it('answers a repeated key with the first spin and never draws again', () => {
    const first = slot.spin({ betMinor: 100, idempotencyKey: 'same' });
    const balance = wallet.getWallet().balanceMinor;

    const again = slot.spin({ betMinor: 100, idempotencyKey: 'same' }, () => {
      throw new Error('a replay must not draw');
    });

    expect(again.spin).toEqual(first.spin);
    expect(again.wallet.balanceMinor).toBe(balance);
  });

  it('rejects a reused key with a different bet', () => {
    slot.spin({ betMinor: 100, idempotencyKey: 'reused' });

    expect(() => slot.spin({ betMinor: 200, idempotencyKey: 'reused' })).toThrow(IdempotencyConflictError);
  });

  it('keeps no record of a spin the balance could not cover', () => {
    wallet.settleSpin(wallet.getWallet().balanceMinor, 0, 'drain');

    expect(() => slot.spin({ betMinor: 50, idempotencyKey: 'broke' })).toThrow(InsufficientFundsError);

    wallet.deposit({ amountMinor: 1_000, currency: 'USD', idempotencyKey: 'top-up' });
    expect(slot.spin({ betMinor: 50, idempotencyKey: 'broke' }).spin.betMinor).toBe(50);
  });
});
