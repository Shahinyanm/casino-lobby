import type { Spin } from '@lobby/contracts';
import { ApiRequestError } from '../../lib/api';
import { depositDidNotApply } from '../wallet/wallet-logic';

export type SpinFailure = 'noFunds' | 'offline' | 'failed' | 'unconfirmed';
export type Outcome = { spin: Spin } | { failure: SpinFailure };

export type SlotState =
  | { phase: 'idle'; stops: number[]; last?: Outcome }
  | { phase: 'spinning'; stops: number[]; key: string }
  | { phase: 'stopping'; stops: number[]; key: string; outcome: Outcome };

export type SlotEvent =
  | { type: 'spin'; key: string }
  | { type: 'answer'; key: string; spin: Spin }
  | { type: 'fail'; key: string; failure: SpinFailure }
  | { type: 'landed'; key: string };

/** idle → spinning → stopping → idle. Any other event is ignored: a second click or a late answer moves nothing. */
export function slotReducer(state: SlotState, event: SlotEvent): SlotState {
  switch (event.type) {
    case 'spin':
      return state.phase === 'idle' ? { phase: 'spinning', stops: state.stops, key: event.key } : state;
    case 'answer':
      return state.phase === 'spinning' && state.key === event.key
        ? { phase: 'stopping', stops: event.spin.stops, key: event.key, outcome: { spin: event.spin } }
        : state;
    case 'fail':
      // No new stops to land on, so the reels come back to where they were.
      return state.phase === 'spinning' && state.key === event.key
        ? { phase: 'stopping', stops: state.stops, key: event.key, outcome: { failure: event.failure } }
        : state;
    case 'landed':
      return state.phase === 'stopping' && state.key === event.key
        ? { phase: 'idle', stops: state.stops, last: state.outcome }
        : state;
  }
}

export function spinFailure(error: unknown): SpinFailure {
  if (error instanceof ApiRequestError && error.code === 'INSUFFICIENT_FUNDS') return 'noFunds';
  if (error instanceof ApiRequestError && error.code === 'OFFLINE') return 'offline';

  return depositDidNotApply(error) ? 'failed' : 'unconfirmed';
}

// Reel motion, in symbols. An offset is the strip index of the top visible row; it falls as the symbols move down.
export const SPIN_SPEED = 0.07; // per ms
export const BRAKE_MS = 900;
const SPIN_UP_MS = 200;

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export const restOffset = (stop: number, length: number) => mod(stop - 1, length);

export const spinDistance = (elapsed: number) =>
  elapsed <= 0
    ? 0
    : elapsed < SPIN_UP_MS
      ? (SPIN_SPEED * elapsed ** 2) / (2 * SPIN_UP_MS)
      : SPIN_SPEED * (elapsed - SPIN_UP_MS / 2);

/**
 * How far a reel at full speed still travels to stop on `target`. Never less than a third of
 * speed × brake time, which keeps the braking curve slowing down all the way (strips up to that long).
 */
export function brakeDistance(from: number, target: number, length: number) {
  const min = (SPIN_SPEED * BRAKE_MS) / 3;
  return min + mod(from - target - min, length);
}

/** Cubic Hermite: starts at full speed, ends at rest exactly `distance` later. */
export function braked(distance: number, progress: number) {
  const u = Math.min(1, Math.max(0, progress));
  return (3 * u ** 2 - 2 * u ** 3) * distance + (u ** 3 - 2 * u ** 2 + u) * SPIN_SPEED * BRAKE_MS;
}
