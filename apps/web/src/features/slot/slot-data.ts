import type { SlotMachine, SpinRequest, SpinResponse } from '@lobby/contracts';
import { queryOptions, useMutation, useMutationState } from '@tanstack/react-query';
import { queryClient } from '../../app/query-client';
import { api, ApiRequestError } from '../../lib/api';
import { randomId } from '../../lib/random-id';
import { createStore } from '../../lib/store';
import { holdBackWin, revealWin, saveWalletSnapshot, walletQuery } from '../wallet/wallet-data';
import { depositDidNotApply, retryDeposit } from '../wallet/wallet-logic';
import { slotReducer, spinFailure, type SlotEvent, type SlotState } from './slot-logic';

export const slotQuery = queryOptions({
  queryKey: ['slot'],
  queryFn: ({ signal }) => api<SlotMachine>('/slot', { signal }),
  staleTime: Infinity,
});

// Outside React, so a spin survives the player leaving the lobby and coming back before it ends.
export const slot = createStore<SlotState>({ phase: 'idle', stops: [0, 0, 0] });

const dispatch = (event: SlotEvent) => {
  slot.set((state) => slotReducer(state, event));
};

const SPIN_KEY = ['spin'];
const SPIN_TIMEOUT_MS = 10_000;
// The reels land about two seconds after the answer. This finishes a spin whose reels are not on screen.
const LANDING_FALLBACK_MS = 5_000;

/** Called by the reels when they land, or by the timer. Shows the win and frees the button. */
export function finishSpin(key: string) {
  revealWin(key);
  dispatch({ type: 'landed', key });
}

const settleLater = (key: string) => setTimeout(() => finishSpin(key), LANDING_FALLBACK_MS);

/** Every callback lives on the mutation, not on `mutate()`: they still run after the slot unmounts. */
export function useSpin() {
  const { mutate } = useMutation({
    mutationKey: SPIN_KEY,
    mutationFn: ({ betMinor, idempotencyKey }: SpinRequest) =>
      navigator.onLine
        ? api<SpinResponse>('/slot/spins', {
            method: 'POST',
            json: { betMinor, idempotencyKey } satisfies SpinRequest,
            signal: AbortSignal.timeout(SPIN_TIMEOUT_MS),
          })
        : Promise.reject(new ApiRequestError(0, 'OFFLINE', 'Offline, spin not sent')),
    // Same rule as deposits: resend with the same key only when nobody knows whether the bet was taken.
    retry: retryDeposit,
    onSuccess: ({ spin, wallet }, { idempotencyKey: key }) => {
      saveWalletSnapshot(wallet);
      dispatch({ type: 'answer', key, spin });
      settleLater(key);
    },
    onError: (error, { idempotencyKey: key }) => {
      dispatch({ type: 'fail', key, failure: spinFailure(error) });
      settleLater(key);
      if (!depositDidNotApply(error)) void queryClient.invalidateQueries({ queryKey: walletQuery.queryKey, exact: true });
    },
  });

  return (betMinor: number) => {
    if (slot.get().phase !== 'idle') return;

    const key = randomId();
    // Held before the request leaves: a wallet read during the spin must not show the win either.
    holdBackWin(key);
    dispatch({ type: 'spin', key });
    mutate({ betMinor, idempotencyKey: key });
  };
}

/** True while a sent spin waits for the connection to come back before it can be resent. */
export const useSpinPaused = () =>
  useMutationState({ filters: { mutationKey: SPIN_KEY, status: 'pending' }, select: (m) => m.state.isPaused }).some(Boolean);
