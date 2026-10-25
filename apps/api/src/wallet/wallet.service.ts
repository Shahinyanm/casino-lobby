import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CurrencyCode,
  DepositRequest,
  DepositResponse,
  FxRates,
  Transaction,
  TransactionType,
  Wallet,
} from '@lobby/contracts';
import { IdempotencyLog } from '../common/idempotency';
import { isDeclinedAmount } from './decline-rule';

export class DepositDeclinedError extends Error {}
export class InsufficientFundsError extends Error {}

const WALLET_CURRENCY: CurrencyCode = 'USD';
const RATES: FxRates = { base: WALLET_CURRENCY, rates: { USD: 1, EUR: 1.08, GBP: 1.27, ILS: 0.27 } };
const RECENT_LIMIT = 20;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

/** Single in-memory wallet: the demo has exactly one player and no persistence. */
@Injectable()
export class WalletService {
  private balanceMinor = 125_000;
  private transactions: Transaction[] = [
    { id: randomUUID(), type: 'win', amountMinor: 4_250, currency: WALLET_CURRENCY, createdAt: minutesAgo(12) },
    { id: randomUUID(), type: 'bet', amountMinor: 500, currency: WALLET_CURRENCY, createdAt: minutesAgo(13) },
    { id: randomUUID(), type: 'bonus', amountMinor: 2_000, currency: WALLET_CURRENCY, createdAt: minutesAgo(95) },
    {
      id: randomUUID(),
      type: 'deposit',
      amountMinor: 10_800,
      currency: WALLET_CURRENCY,
      createdAt: minutesAgo(240),
      source: { amountMinor: 10_000, currency: 'EUR' },
    },
  ];
  // Starts at boot time, so a restarted mock never looks older than the snapshot an open tab still holds.
  private revision = Date.now();
  // Only what a replay needs, no wallet snapshot per key.
  private readonly processed = new IdempotencyLog<Transaction>();

  getWallet(): Wallet {
    return {
      currency: WALLET_CURRENCY,
      balanceMinor: this.balanceMinor,
      revision: this.revision,
      transactions: this.transactions.slice(0, RECENT_LIMIT),
    };
  }

  getRates(): FxRates {
    return RATES;
  }

  deposit({ amountMinor, currency, idempotencyKey }: DepositRequest): DepositResponse {
    const fingerprint = `${amountMinor}:${currency}`;
    const replay = this.processed.replay(idempotencyKey, fingerprint);

    // The current wallet, not the one from the first time: the client keeps whichever revision is newer.
    if (replay) return { wallet: this.getWallet(), transaction: replay };

    if (isDeclinedAmount(amountMinor)) throw new DepositDeclinedError();

    const transaction: Transaction = {
      ...this.row('deposit', Math.round(amountMinor * RATES.rates[currency]), idempotencyKey),
      ...(currency === WALLET_CURRENCY ? {} : { source: { amountMinor, currency } }),
    };

    this.apply(transaction.amountMinor, [transaction]);
    this.processed.record(idempotencyKey, fingerprint, transaction);

    return { wallet: this.getWallet(), transaction };
  }

  /** Bet and win in one revision, so no snapshot shows a spin half paid. */
  settleSpin(betMinor: number, winMinor: number, reference: string): Wallet {
    if (betMinor > this.balanceMinor) throw new InsufficientFundsError();

    const bet = this.row('bet', betMinor, reference);
    this.apply(winMinor - betMinor, winMinor > 0 ? [this.row('win', winMinor, reference), bet] : [bet]);

    return this.getWallet();
  }

  private row(type: TransactionType, amountMinor: number, reference: string): Transaction {
    return { id: randomUUID(), type, amountMinor, currency: WALLET_CURRENCY, createdAt: new Date().toISOString(), reference };
  }

  private apply(deltaMinor: number, rows: Transaction[]) {
    this.balanceMinor += deltaMinor;
    this.transactions = [...rows, ...this.transactions].slice(0, RECENT_LIMIT);
    this.revision += 1;
  }
}
