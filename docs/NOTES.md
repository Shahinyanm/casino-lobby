# Notes

## Riskiest line

`apps/web/src/features/wallet/wallet-data.ts:93`

```ts
retry: retryDeposit,
```

This line sends a money request again on its own, and the slot uses the same rule for spins. When the connection drops after a deposit was sent, nobody knows whether the server took the money, so I resend the same request with the same idempotency key. That is safe only because the server keeps each key for 24 hours and answers a repeat with the original transaction. If a real backend expired keys sooner than the retry window, or ignored a different amount under the same key, this line would credit the player twice. It also has a limit: if every resend goes unanswered and the wallet can't be read either, the row disappears and the balance shows the old number. The toast says the deposit could not be confirmed and asks the player to check before trying again, but the screen stays wrong until the next successful read.

## With a week

1. Playwright end-to-end tests for the flows I checked by hand: filters with Back and deep links, deposit success and decline, offline, RTL. Run axe in CI on the same pages.
2. Validate API responses at the boundary (zod or valibot). Today the types trust the server.
3. A lookup by idempotency key (`GET /wallet/deposits/:key`), so a deposit whose resends all failed stays on screen as "unconfirmed" until the server says what happened. And currencies that don't have two decimals: minor units currently assume cents, which is wrong for JPY.
4. Server-side filtering and pagination behind the same URL parameters, plus a virtualized grid once the catalog passes a thousand games.
5. A provably fair slot: the server commits to a seed hash before the spin and reveals the seed after it, so a player can check any spin.
6. Bundle size: the main chunk is 140 KB gzipped. Split vendor code and load the catalog section lazily below the fold.
7. A real translation workflow: ICU MessageFormat once copy needs gender or select, and a CI check that every language has every key (TypeScript does this today for Hebrew).

## Known limits

- A deposit whose answer is lost, or does not come within 10 s, is resent three times with the same key. If none of them gets an answer and the wallet can't be read either, the row disappears and the balance shows the old number until a wallet read works again (it is retried every 10 s). Only the toast says the money may have arrived.
- The page is built for 360 px and up. At 320 px the lobby is still about 30 px too wide.
- Thumbnails offline: only the ones you have already seen are cached.
- The mock has one wallet for every tab and forgets everything on restart.
- The slot has one payline and no bonus rounds. If the player leaves the lobby mid-spin, a win shows on the balance within 5 s instead of at the landing.
- ESLint is pinned to 9 and npm says it is out of support: `eslint-plugin-react` and `eslint-plugin-jsx-a11y` don't support ESLint 10 yet. The `glob` deprecation warning on install comes from `workbox-build` inside the PWA plugin.
- Promo copy comes from the API in the requested language (it is content, not UI). Game titles and player names are names, so they are not translated.
