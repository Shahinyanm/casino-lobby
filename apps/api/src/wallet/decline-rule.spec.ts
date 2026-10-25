import { describe, expect, it } from 'vitest';
import { isDeclinedAmount } from './decline-rule';

describe('isDeclinedAmount', () => {
  it.each([
    [1900, '19'],
    [900, '9'],
    [990, '9.9'],
    [999, '9.99'],
    [1090, '10.9'],
    [10009, '100.09'],
  ])('declines %i minor units (typed as %s)', (amountMinor) => {
    expect(isDeclinedAmount(amountMinor)).toBe(true);
  });

  it.each([
    [2000, '20'],
    [1000, '10'],
    [1050, '10.5'],
    [9000, '90'],
    [1, '0.01'],
    [9010, '90.1'],
  ])('accepts %i minor units (typed as %s)', (amountMinor) => {
    expect(isDeclinedAmount(amountMinor)).toBe(false);
  });
});
