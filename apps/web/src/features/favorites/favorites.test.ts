import { describe, expect, it } from 'vitest';
import { moveItem, parseFavorites, toggleItem } from './favorites';

describe('moveItem', () => {
  it('moves forwards and backwards', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps out-of-range targets and returns the same array for no-op moves', () => {
    const list = ['a', 'b', 'c'];

    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 99)).toBe(list);
    expect(moveItem(list, 0, 5)).toEqual(['b', 'c', 'a']);
  });
});

describe('toggleItem', () => {
  it('appends new favorites at the end and removes existing ones', () => {
    expect(toggleItem(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleItem(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('parseFavorites', () => {
  it('survives corrupted storage', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('{not json')).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
    expect(parseFavorites('["a", 3, "a", "b"]')).toEqual(['a', 'b']);
  });
});
