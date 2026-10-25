/**
 * Demo failure hook from the spec: a deposit fails when the amount the player typed ends in 9.
 * "Typed" means the shortest decimal form: 19, 9.9 and 10.90 (= 10.9) all fail, 90.1 does not.
 * Works on integer minor units, so there is no float formatting involved.
 */
export function isDeclinedAmount(amountMinor: number): boolean {
  let digits = amountMinor;

  // Drop trailing zeros of the fractional part: 1900 -> 19, 1090 -> 109.
  if (digits % 100 === 0) digits /= 100;
  else if (digits % 10 === 0) digits /= 10;

  return digits % 10 === 9;
}
