import type { CurrencyCode, FxRates, Transaction, Wallet } from '@lobby/contracts';
import { ApiRequestError } from '../../lib/api';

export const MIN_DEPOSIT_MINOR = 100;
export const MAX_DEPOSIT_MINOR = 1_000_000;

export type AmountResult = { ok: true; minor: number } | { ok: false; error: 'required' | 'format' | 'min' | 'max' };

/** "25", "25.5", "25,50" -> minor units. String arithmetic only: 0.1 + 0.2 never touches money. */
export function parseAmount(text: string): AmountResult {
  const value = text.trim();
  if (!value) return { ok: false, error: 'required' };

  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(value);
  if (!match) return { ok: false, error: 'format' };

  const [, whole = '0', fraction = ''] = match;
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  if (minor < MIN_DEPOSIT_MINOR) return { ok: false, error: 'min' };
  if (minor > MAX_DEPOSIT_MINOR) return { ok: false, error: 'max' };
  return { ok: true, minor };
}

/** The client's quote. The server converts again and its number wins once it answers. */
export const quoteCredit = (amountMinor: number, currency: CurrencyCode, fx: FxRates) =>
  Math.round(amountMinor * fx.rates[currency]);

/**
 * True only when the server certainly did not take the money: it answered 4xx, or the request was
 * never sent. A dropped connection or a 5xx leaves the outcome unknown, so the wallet must be re-read.
 */
export const depositDidNotApply = (error: unknown) =>
  error instanceof ApiRequestError && (error.code === 'OFFLINE' || (error.status >= 400 && error.status < 500));

const DEPOSIT_RETRIES = 3;

/**
 * An unknown outcome is resolved by sending the same request again: the idempotency key makes the
 * server replay its first answer instead of crediting twice.
 */
export const retryDeposit = (failureCount: number, error: unknown) =>
  !depositDidNotApply(error) && failureCount < DEPOSIT_RETRIES;

/** Answers can arrive out of order; the snapshot with the higher revision is the true one. */
export const newerWallet = (current: Wallet | undefined, incoming: Wallet) =>
  current && current.revision > incoming.revision ? current : incoming;

/** Variables of an in-flight deposit mutation: the request plus what the UI needs to show it. */
export interface PendingDeposit {
  idempotencyKey: string;
  amountMinor: number;
  currency: CurrencyCode;
  creditMinor: number;
  startedAt: string;
}

export type WalletRow = Transaction & { pending?: true };
export type WalletView = Omit<Wallet, 'transactions'> & { transactions: WalletRow[] };

/**
 * Optimistic view = server wallet + deposits still in flight. Nothing is written into the cache,
 * so a failed deposit needs no rollback: it stops being pending and disappears from the sum.
 * A deposit the server already reports (matched by its idempotency key) is not added again,
 * which keeps the balance from double-counting during the refetch after success. `applied` holds
 * keys an earlier snapshot showed, for deposits newer ones pushed out of the 20 recent rows.
 */
export function overlayPendingDeposits(
  wallet: Wallet,
  pending: readonly PendingDeposit[],
  applied: ReadonlySet<string> = new Set(),
): WalletView {
  const listed = new Set(wallet.transactions.map((t) => t.reference));
  const settled = (key: string) => listed.has(key) || applied.has(key);
  const inFlight = [...new Map(pending.filter((p) => !settled(p.idempotencyKey)).map((p) => [p.idempotencyKey, p])).values()];

  if (!inFlight.length) return { ...wallet, transactions: wallet.transactions };

  const rows: WalletRow[] = inFlight
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((p) => ({
      id: `pending:${p.idempotencyKey}`,
      type: 'deposit',
      amountMinor: p.creditMinor,
      currency: wallet.currency,
      createdAt: p.startedAt,
      reference: p.idempotencyKey,
      pending: true,
      ...(p.currency === wallet.currency ? {} : { source: { amountMinor: p.amountMinor, currency: p.currency } }),
    }));

  return {
    ...wallet,
    balanceMinor: wallet.balanceMinor + inFlight.reduce((sum, p) => sum + p.creditMinor, 0),
    transactions: [...rows, ...wallet.transactions],
  };
}

/** Keeps a slot win off the balance and the list until its reels have landed. */
export function holdBackWins(view: WalletView, held: ReadonlySet<string>): WalletView {
  const hidden = view.transactions.filter((t) => t.type === 'win' && t.reference !== undefined && held.has(t.reference));
  if (!hidden.length) return view;

  return {
    ...view,
    balanceMinor: view.balanceMinor - hidden.reduce((sum, t) => sum + t.amountMinor, 0),
    transactions: view.transactions.filter((t) => !hidden.includes(t)),
  };
}
