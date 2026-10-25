import type { Win } from '@lobby/contracts';
import { describe, expect, it } from 'vitest';
import { createFeedStore } from './feed-store';

const win = (id: number): Win => ({
  id: String(id),
  player: 'Noa K.',
  avatarHue: 10,
  gameId: 'golden-koi',
  gameTitle: 'Golden Koi',
  amountMinor: 100 * id,
  currency: 'USD',
  at: new Date(0).toISOString(),
});

const ids = (wins: readonly Win[]) => wins.map((w) => w.id);

describe('feed store', () => {
  it('shows newest first and never holds more than its capacity', () => {
    const feed = createFeedStore(3);
    for (let i = 1; i <= 5; i++) feed.receive({ type: 'win', win: win(i) });

    expect(ids(feed.store.get().wins)).toEqual(['5', '4', '3']);
  });

  it('buffers while paused without touching the visible list, then flushes on resume', () => {
    const feed = createFeedStore(10);
    feed.receive({ type: 'win', win: win(1) });
    const visible = feed.store.get().wins;

    feed.setPaused('hover', true);
    feed.receive({ type: 'win', win: win(2) });
    feed.receive({ type: 'win', win: win(3) });

    expect(feed.store.get().wins).toBe(visible);
    expect(ids(feed.store.get().pending)).toEqual(['3', '2']);

    feed.setPaused('hover', false);

    expect(ids(feed.store.get().wins)).toEqual(['3', '2', '1']);
    expect(feed.store.get().pending).toEqual([]);
  });

  it('keeps the pause buffer bounded too, however long the tab stays hidden', () => {
    const feed = createFeedStore(5);
    feed.setPaused('hidden', true);
    for (let i = 1; i <= 1000; i++) feed.receive({ type: 'win', win: win(i) });

    expect(feed.store.get().pending).toHaveLength(5);
    expect(feed.store.get().pending[0]?.id).toBe('1000');
  });

  it('resumes only when every pause reason is gone', () => {
    const feed = createFeedStore(5);
    feed.setPaused('hover', true);
    feed.setPaused('manual', true);
    feed.receive({ type: 'win', win: win(1) });

    feed.setPaused('hover', false);
    expect(feed.store.get().wins).toEqual([]);

    feed.setPaused('manual', false);
    expect(ids(feed.store.get().wins)).toEqual(['1']);
  });

  it('keeps the jackpot moving while the list is paused', () => {
    const feed = createFeedStore(5);
    feed.setPaused('hover', true);
    feed.receive({ type: 'jackpot', jackpotMinor: 500 });

    expect(feed.store.get().jackpotMinor).toBe(500);
  });

  it('replaces state from a snapshot after (re)connecting', () => {
    const feed = createFeedStore(2);
    feed.receive({ type: 'win', win: win(9) });
    feed.receive({ type: 'snapshot', jackpotMinor: 42, wins: [win(3), win(2), win(1)] });

    expect(ids(feed.store.get().wins)).toEqual(['3', '2']);
    expect(feed.store.get().jackpotMinor).toBe(42);
  });

  it('queues only the new wins from a snapshot that arrives while paused', () => {
    const feed = createFeedStore(10);
    feed.receive({ type: 'snapshot', wins: [win(2), win(1)], jackpotMinor: 1 });
    feed.setPaused('hover', true);
    const visible = feed.store.get().wins;

    feed.receive({ type: 'snapshot', wins: [win(4), win(3), win(2), win(1)], jackpotMinor: 2 });
    expect(feed.store.get().wins).toBe(visible);
    expect(ids(feed.store.get().pending)).toEqual(['4', '3']);

    feed.setPaused('hover', false);
    expect(ids(feed.store.get().wins)).toEqual(['4', '3', '2', '1']);
  });
});
