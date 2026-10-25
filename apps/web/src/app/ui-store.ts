import { createStore } from '../lib/store';

/** Global overlays that can be opened from several places (header, wallet card, command palette). */
export const ui = createStore({ depositOpen: false, paletteOpen: false });

export const openDeposit = () => {
  ui.set((s) => ({ ...s, depositOpen: true, paletteOpen: false }));
};
export const closeDeposit = () => {
  ui.set((s) => ({ ...s, depositOpen: false }));
};
export const openPalette = () => {
  ui.set((s) => ({ ...s, paletteOpen: true }));
};
export const closePalette = () => {
  ui.set((s) => ({ ...s, paletteOpen: false }));
};
