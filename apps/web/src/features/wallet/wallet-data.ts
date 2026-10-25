import type { DepositRequest, DepositResponse, FxRates, Wallet } from '@lobby/contracts';
import { queryOptions, replaceEqualDeep, useMutation, useMutationState } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryClient } from '../../app/query-client';
import { api, ApiRequestError } from '../../lib/api';
import { createStore, useStore } from '../../lib/store';
import { showToast } from '../../ui/toasts';
import {
  depositDidNotApply,
  holdBackWins,
  newerWallet,
  overlayPendingDeposits,
  retryDeposit,
  type PendingDeposit,
} from './wallet-logic';

// Every deposit key a server snapshot has shown as applied. A snapshot lists only the 20 newest
// transactions, so a deposit still waiting for its own answer can drop out of it; it was applied all the same.
const appliedKeys = new Set<string>();

/** Every snapshot, from a wallet read or a deposit answer, passes here: note what it proves, keep the newest. */
const acceptWallet = (current: Wallet | undefined, incoming: Wallet) => {
  for (const tx of incoming.transactions) if (tx.reference) appliedKeys.add(tx.reference);
  return newerWallet(current, incoming);
};

export const walletQuery = queryOptions({
  queryKey: ['wallet'],
  queryFn: ({ signal }) => api<Wallet>('/wallet', { signal }),
  // Money must not go stale silently: re-read it on return to the tab (another tab may have deposited)
  // and keep retrying a failed read (a load while offline, a re-read after a lost deposit answer).
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchInterval: (query) => (query.state.status === 'error' ? 10_000 : false),
  // A wallet read that started before a deposit landed must not replace the deposit's newer snapshot.
  structuralSharing: (old, next) => replaceEqualDeep(old, acceptWallet(old as Wallet | undefined, next as Wallet)),
});

/** For answers that carry the whole wallet: deposits and spins. */
export const saveWalletSnapshot = (wallet: Wallet) =>
  queryClient.setQueryData(walletQuery.queryKey, (current) => acceptWallet(current, wallet));

// Spin keys whose win the reels have not shown yet.
const heldWins = createStore<ReadonlySet<string>>(new Set());

export const holdBackWin = (key: string) => {
  heldWins.set((keys) => new Set(keys).add(key));
};
export const revealWin = (key: string) => {
  heldWins.set((keys) => (keys.has(key) ? new Set([...keys].filter((k) => k !== key)) : keys));
};

export const ratesQuery = queryOptions({
  queryKey: ['wallet', 'rates'],
  queryFn: ({ signal }) => api<FxRates>('/wallet/rates', { signal }),
  staleTime: 10 * 60_000,
});

const DEPOSIT_KEY = ['deposit'];
const DEPOSIT_TIMEOUT_MS = 10_000;

/** The server wallet with in-flight deposits layered on top (see overlayPendingDeposits). */
export function useWalletView(wallet: Wallet | undefined) {
  const pending = useMutationState({
    filters: { mutationKey: DEPOSIT_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as PendingDeposit,
  });
  const held = useStore(heldWins);

  return useMemo(
    () => (wallet ? holdBackWins(overlayPendingDeposits(wallet, pending, appliedKeys), held) : undefined),
    [wallet, pending, held],
  );
}

/**
 * Callbacks live on the mutation, not on `mutate()`: the dialog closes right after submit,
 * and the result must still be handled after it unmounts.
 */
export function useDeposit() {
  return useMutation({
    mutationKey: DEPOSIT_KEY,
    mutationFn: ({ amountMinor, currency, idempotencyKey }: PendingDeposit) =>
      // Checked up front: once a request is sent, a network error no longer proves nothing happened.
      navigator.onLine
        ? api<DepositResponse>('/wallet/deposits', {
            method: 'POST',
            json: { amountMinor, currency, idempotencyKey } satisfies DepositRequest,
            // A request that hangs becomes an unknown outcome and is resent, instead of "Processing" forever.
            signal: AbortSignal.timeout(DEPOSIT_TIMEOUT_MS),
          })
        : Promise.reject(new ApiRequestError(0, 'OFFLINE', 'Offline, deposit not sent')),
    retry: retryDeposit,
    onSuccess: (data, deposit) => {
      // Write the server's snapshot right away, so a failed refetch cannot show the old balance. It lists
      // every deposit already applied, so the overlay stops counting their pending copies; an older
      // snapshot arriving late (parallel deposits) loses to the newer one.
      saveWalletSnapshot(data.wallet);
      showToast('success', ({ t, money }) => t('deposit.success', { amount: money(deposit.amountMinor, deposit.currency) }));
    },
    onError: (error, deposit) => {
      const code = error instanceof ApiRequestError ? error.code : 'INTERNAL';
      const key =
        code === 'DEPOSIT_DECLINED'
          ? 'deposit.declined'
          : code === 'OFFLINE'
            ? 'deposit.offline'
            : depositDidNotApply(error)
              ? 'deposit.failed'
              : 'deposit.unconfirmed';
      showToast('error', ({ t, money }) => t(key, { amount: money(deposit.amountMinor, deposit.currency) }));
    },
    // Returning the promise keeps the mutation "pending" until fresh server data has landed, so the
    // optimistic row hands over to the real one without a flicker. An unknown outcome (the connection
    // dropped after sending) is first resent with the same key; if that never gets an answer, the row
    // stays until the wallet is read again. Only a certain failure drops the deposit at once.
    onSettled: (_data, error) =>
      depositDidNotApply(error) ? undefined : queryClient.invalidateQueries({ queryKey: walletQuery.queryKey, exact: true }),
  });
}
