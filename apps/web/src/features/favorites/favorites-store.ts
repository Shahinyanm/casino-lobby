import { storage } from '../../lib/storage';
import { createStore, useStore } from '../../lib/store';
import { moveItem, parseFavorites, toggleItem } from './favorites';

const KEY = 'lobby:favorites';

/** Ordered game ids. Lives outside React so toggling one heart does not re-render the grid. */
export const favorites = createStore<readonly string[]>(parseFavorites(storage.get(KEY)));

favorites.subscribe(() => {
  storage.set(KEY, JSON.stringify(favorites.get()));
});

// Another tab changed the list: follow it.
window.addEventListener('storage', (event) => {
  if (event.key === KEY) favorites.set(parseFavorites(event.newValue));
});

export const toggleFavorite = (id: string) => {
  favorites.set((list) => toggleItem(list, id));
};

/** Moves `id` into the place of `targetId`. Ids, not indexes: the row hides ids the catalog lacks. */
export const moveFavorite = (id: string, targetId: string) => {
  favorites.set((list) => moveItem(list, list.indexOf(id), list.indexOf(targetId)));
};

export const useIsFavorite = (id: string) => useStore(favorites, (list) => list.includes(id));
export const useFavorites = () => useStore(favorites);
