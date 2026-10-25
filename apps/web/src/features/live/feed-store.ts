import type { LiveMessage, Win } from '@lobby/contracts';
import { createStore } from '../../lib/store';

export type FeedStatus = 'connecting' | 'live' | 'reconnecting';
export type PauseReason = 'hover' | 'focus' | 'hidden' | 'manual' | 'collapsed';

export interface FeedState {
  status: FeedStatus;
  /** What the player sees, newest first */
  wins: readonly Win[];
  /** Arrived while paused, newest first, shown as "N new wins" */
  pending: readonly Win[];
  pausedBy: readonly PauseReason[];
  jackpotMinor: number | null;
}

/**
 * Bounded ring of wins. Both lists are capped, so a tab left hidden for a day holds `capacity`
 * items, not a day's worth. Pausing freezes the visible list (same array reference, so React
 * does not re-render it) and resumes only when every reason is cleared.
 */
export function createFeedStore(capacity = 30) {
  const store = createStore<FeedState>({ status: 'connecting', wins: [], pending: [], pausedBy: [], jackpotMinor: null });

  const receive = (message: LiveMessage) => {
    store.set((s) => {
      switch (message.type) {
        case 'snapshot': {
          const wins = message.wins.slice(0, capacity);
          if (!s.pausedBy.length) return { ...s, wins, pending: [], jackpotMinor: message.jackpotMinor };

          // A reconnect while paused must not swap the list under the cursor: queue only what is new.
          const shown = new Set(s.wins.map((win) => win.id));
          return { ...s, pending: wins.filter((win) => !shown.has(win.id)), jackpotMinor: message.jackpotMinor };
        }
        case 'jackpot':
          return { ...s, jackpotMinor: message.jackpotMinor };
        case 'win':
          return s.pausedBy.length
            ? { ...s, pending: [message.win, ...s.pending].slice(0, capacity) }
            : { ...s, wins: [message.win, ...s.wins].slice(0, capacity) };
      }
    });
  };

  const setPaused = (reason: PauseReason, paused: boolean) => {
    store.set((s) => {
      if (s.pausedBy.includes(reason) === paused) return s;

      const pausedBy = paused ? [...s.pausedBy, reason] : s.pausedBy.filter((r) => r !== reason);
      if (pausedBy.length || !s.pending.length) return { ...s, pausedBy };

      return { ...s, pausedBy, wins: [...s.pending, ...s.wins].slice(0, capacity), pending: [] };
    });
  };

  const setStatus = (status: FeedStatus) => {
    store.set((s) => (s.status === status ? s : { ...s, status }));
  };

  return { store, receive, setPaused, setStatus };
}
