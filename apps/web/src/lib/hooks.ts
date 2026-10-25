import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// One shared clock for relative times ("12 seconds ago"): a single interval, only while someone listens.
const CLOCK_MS = 10_000;
let now = Date.now();
const listeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | undefined;

function subscribeClock(listener: () => void) {
  listeners.add(listener);
  if (!clockTimer) {
    now = Date.now();
    clockTimer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => {
        l();
      });
    }, CLOCK_MS);
  }

  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

export const useNow = () => useSyncExternalStore(subscribeClock, () => now);
