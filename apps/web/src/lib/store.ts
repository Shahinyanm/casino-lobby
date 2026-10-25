import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Minimal external store: state that lives outside React and is read with `useSyncExternalStore`. */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (next) => {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) return;

      state = value;
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** `select` must return a primitive or a reference already held in state, otherwise React re-renders forever. */
export function useStore<T, S = T>(store: Store<T>, select: (state: T) => S = (state) => state as unknown as S): S {
  const read = () => select(store.get());
  return useSyncExternalStore(store.subscribe, read, read);
}
