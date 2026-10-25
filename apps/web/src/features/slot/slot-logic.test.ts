import type { Spin } from '@lobby/contracts';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../lib/api';
import {
  BRAKE_MS,
  brakeDistance,
  braked,
  mod,
  restOffset,
  slotReducer,
  SPIN_SPEED,
  spinFailure,
  type SlotState,
} from './slot-logic';

const idle: SlotState = { phase: 'idle', stops: [0, 0, 0] };
const spin: Spin = { id: 's1', betMinor: 100, stops: [4, 7, 9], winMinor: 0 };

describe('slotReducer', () => {
  it('walks idle → spinning → stopping → idle and keeps the result', () => {
    const spinning = slotReducer(idle, { type: 'spin', key: 'k' });
    const stopping = slotReducer(spinning, { type: 'answer', key: 'k', spin });
    const done = slotReducer(stopping, { type: 'landed', key: 'k' });

    expect(spinning).toEqual({ phase: 'spinning', stops: [0, 0, 0], key: 'k' });
    expect(stopping).toMatchObject({ phase: 'stopping', stops: [4, 7, 9] });
    expect(done).toEqual({ phase: 'idle', stops: [4, 7, 9], last: { spin } });
  });

  it('ignores a second spin until the reels have landed', () => {
    const spinning = slotReducer(idle, { type: 'spin', key: 'first' });
    const stopping = slotReducer(spinning, { type: 'answer', key: 'first', spin });

    expect(slotReducer(spinning, { type: 'spin', key: 'second' })).toBe(spinning);
    expect(slotReducer(stopping, { type: 'spin', key: 'second' })).toBe(stopping);
  });

  it('ignores an answer for another spin and a landing nobody started', () => {
    const spinning = slotReducer(idle, { type: 'spin', key: 'k' });

    expect(slotReducer(spinning, { type: 'answer', key: 'old', spin })).toBe(spinning);
    expect(slotReducer(spinning, { type: 'landed', key: 'k' })).toBe(spinning);
    expect(slotReducer(idle, { type: 'answer', key: 'k', spin })).toBe(idle);
  });

  it('lets only its own spin land: a late timer from an earlier spin changes nothing', () => {
    const stopping = slotReducer(slotReducer(idle, { type: 'spin', key: 'new' }), { type: 'answer', key: 'new', spin });

    expect(slotReducer(stopping, { type: 'landed', key: 'old' })).toBe(stopping);
  });

  it('brings the reels back to their old stops when a spin fails', () => {
    const spinning = slotReducer({ phase: 'idle', stops: [1, 2, 3] }, { type: 'spin', key: 'k' });
    const stopping = slotReducer(spinning, { type: 'fail', key: 'k', failure: 'noFunds' });

    expect(stopping).toMatchObject({ phase: 'stopping', stops: [1, 2, 3], outcome: { failure: 'noFunds' } });
  });
});

describe('spinFailure', () => {
  it.each([
    [new ApiRequestError(422, 'INSUFFICIENT_FUNDS', ''), 'noFunds'],
    [new ApiRequestError(0, 'OFFLINE', ''), 'offline'],
    [new ApiRequestError(400, 'VALIDATION_FAILED', ''), 'failed'],
    [new ApiRequestError(0, 'NETWORK', ''), 'unconfirmed'],
    [new ApiRequestError(503, 'INTERNAL', ''), 'unconfirmed'],
  ])('%s → %s', (error, failure) => {
    expect(spinFailure(error)).toBe(failure);
  });
});

describe('reel braking', () => {
  const length = 20;

  it('stops with the target on the middle row from any starting point', () => {
    for (const from of [0, 0.4, 7.9, 19.99]) {
      for (const stop of [0, 5, 19]) {
        const end = from - braked(brakeDistance(from, restOffset(stop, length), length), 1);
        const miss = mod(end + 1 - stop + length / 2, length) - length / 2;

        expect(miss).toBeCloseTo(0, 9);
      }
    }
  });

  it('enters at spin speed and only ever slows down', () => {
    for (const distance of [brakeDistance(0, 19, length), brakeDistance(0, 0, length), brakeDistance(0, 1, length)]) {
      const step = 0.001;
      let previous = Infinity;

      for (let u = 0; u < 1; u += step) {
        const speed = (braked(distance, u + step) - braked(distance, u)) / (step * BRAKE_MS);
        expect(speed).toBeLessThanOrEqual(Math.min(previous, SPIN_SPEED) + 1e-6);
        expect(speed).toBeGreaterThanOrEqual(0);
        previous = speed;
      }
    }
  });
});
