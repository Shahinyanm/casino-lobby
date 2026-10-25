# Runbook: how to see each claim

Start with `npm install && npm start` and open http://localhost:3000. "Settings" below is the sliders icon in the header.

## Fundamentals (§1)

| Claim | How to see it |
|---|---|
| Responsive | DevTools device toolbar at 360, 768, 1024, 1440: no horizontal scrollbar. On phones the categories and tags become one swipeable row and live wins collapse behind a toggle. |
| Light / dark | Sun/moon button in the header. Reload keeps it. On a first visit it follows the OS setting. |
| AA contrast | `npm test -w @lobby/web -- tokens` checks every text/background pair in both themes for all 36 accent hues. axe DevTools on any page: 0 issues. |
| Keyboard and screen reader | Tab from the top: skip link, header, jackpot, promos, wallet, live wins, slot, catalog. Every icon button has a label. Esc closes dialogs and focus goes back to where it was. The result count is announced as you filter. |
| No console noise | Open the console on a fresh load of `npm start` or `npm run dev`: nothing from the app. The one line you can produce is Chrome's own network log for the 422 of a deposit you decline on purpose. |
| Loading / empty / error | DevTools → Network → Slow 3G, reload: skeletons everywhere. Network → block request URL `/api/games`, reload: "Games did not load" with Try again (same for `/api/wallet`, `/api/promotions`, `/api/slot`). `/?q=zzzz` shows the empty state. |
| Type safety | `npm run check`: `tsc --noEmit` on both apps, ESLint with `strictTypeChecked` and `jsx-a11y/strict`, all tests. |

## Core features (§2)

| Claim | How to see it |
|---|---|
| Filters work together | Open `/?category=slots&provider=neon-owl,aurora-forge&tag=jackpot,hot&sort=rtp`: every control comes back as in the link. Groups combine with AND, values inside a group with OR. |
| URL is the state | Click filters and watch the address bar. Back undoes the last click. Typing in search replaces the entry instead of adding one per keystroke, and Back after typing clears the box. |
| Debounced search | Type fast in the search box: the URL and the count change once, 250 ms after you stop. Matching ignores case and accents and also checks the provider name. |
| No results | `/?q=zzzz&tag=vip`, then "Clear filters" (sort is kept). |
| Live feed | Hover the list: status turns "Paused" and "N new wins waiting" counts up; move away and they flush in. Switch tabs for a while and come back: at most 30 wins are kept. React DevTools → Profiler → "Highlight updates": only the feed flashes on each win, the grid never does. |
| Wallet and deposit | Deposit 50 EUR: the quote says $54.00, the balance counts up at once and a "Processing" row appears, then a success toast. |
| Decline path | Deposit 19 (or 9.99, 10.90): the balance goes up, then back down, a red toast explains why, the list is as before. The rule lives on the server (`apps/api/src/wallet/decline-rule.ts`). |
| Parallel deposits | Deposit 50, then 30 right away: the balance only goes up and ends at the server's number, even when the answers arrive out of order. The newer wallet snapshot wins by its `revision`. |
| Lost answer | DevTools → Network → block `/api/wallet/deposits`, deposit, unblock within 5 s. The row stays "Processing" while the same request is resent with the same key (after 1, 2 and 4 s). Once it gets through, the money is credited once. If no answer comes back at all, the toast says the deposit could not be confirmed. |
| Promotions | Touch emulation: swipe with momentum and snapping. Desktop: arrow buttons, trackpad, or Tab into the region and use the arrow keys. |
| Single source of text | All copy is in `apps/web/src/i18n/en.ts`. ESLint fails the build on a string literal in JSX or in `aria-label`, `title`, `placeholder`, `alt`. |
| Command palette | Ctrl/Cmd+K, type `gr`: Golden Reels and friends via word initials. Arrows, Enter. It also switches theme, language, opens the deposit dialog and filters by provider. |

## Bonus items (§3)

| Item | How to see it |
|---|---|
| H1 Hebrew + RTL | Settings → Language → עברית: the whole layout mirrors, numbers and currency follow Hebrew rules. "Pseudo-locale (QA)" makes every string ~40% longer to show nothing breaks. |
| H2 Offline | Load the lobby twice with `npm start`, then DevTools → Network → Offline and reload: shell, last catalog and promos are there, an offline banner shows, the wallet shows its own error, live wins say "Reconnecting". A deposit attempted offline fails at once with a clear message. |
| H3 Palette ranking | Ctrl+K, type `craps`: "Craps" first, then "Live Craps". `apps/web/src/features/palette/fuzzy.test.ts` pins the ranking rules. |
| H4 Accent | Settings → Accent color. Drag the slider: buttons, jackpot, focus rings and links re-theme live. "Reset color" returns to brass. |
| H5 Jackpot | Watch the number count continuously. DevTools → Rendering → "Emulate prefers-reduced-motion: reduce": it jumps instead. Performance recording while the feed streams: steady frames. |
| H6 Favorites | Tap hearts on a few games. Drag the grip handle to reorder, or Tab to a handle and press Alt + arrow keys. Reload keeps the order; a second tab follows changes. |
| H8 Slot | Brass Sevens, under the promos (below the wallet on a phone). Press Spin: the balance drops by the bet when the server answers, the reels land one by one, and a win is added only after the last one stops. Double-click Spin or hold Enter: the Network tab shows one request. Press Spin and switch Network to Offline before the answer: the status waits for the connection, and back online the same key is resent and the bet is taken once. `npm test -w @lobby/api -- slot` walks all 8 000 stop combinations and gets the 95.80% shown in the paytable. With reduced motion the reels jump to the result. |
