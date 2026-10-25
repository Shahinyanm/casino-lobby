import type { LiveMessage, Win } from '@lobby/contracts';
import { createFeedStore } from './feed-store';

export const liveFeed = createFeedStore(30);

const MAX_BACKOFF_MS = 15_000;
// The jackpot ticks every 2 s, so 10 s of silence means a dead link (laptop sleep, network switch)
// that the browser has not noticed yet.
const SILENCE_MS = 10_000;
const CURRENCIES = new Set<string>(['USD', 'EUR', 'GBP', 'ILS']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isWin = (value: unknown): value is Win =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.player === 'string' &&
  typeof value.gameId === 'string' &&
  typeof value.gameTitle === 'string' &&
  Number.isFinite(value.avatarHue) &&
  Number.isFinite(value.amountMinor) &&
  typeof value.currency === 'string' &&
  CURRENCIES.has(value.currency) &&
  typeof value.at === 'string' &&
  Number.isFinite(Date.parse(value.at));

/** Every field the UI formats is checked: one bad win must not take the lobby down with it. */
export const isLiveMessage = (value: unknown): value is LiveMessage => {
  if (!isRecord(value)) return false;

  switch (value.type) {
    case 'win':
      return isWin(value.win);
    case 'jackpot':
      return Number.isFinite(value.jackpotMinor);
    case 'snapshot':
      return Number.isFinite(value.jackpotMinor) && Array.isArray(value.wins) && value.wins.every(isWin);
    default:
      return false;
  }
};

/**
 * One socket for the whole app, reconnecting with jittered exponential backoff.
 * A hidden tab pauses the feed (it buffers, bounded) instead of dropping the connection,
 * so coming back shows what was missed without a reconnect.
 */
export function startLiveFeed() {
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;

  const reconnectLater = () => {
    clearTimeout(silenceTimer);
    liveFeed.setStatus('reconnecting');
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt++) * (0.5 + Math.random() / 2);
    retryTimer = setTimeout(connect, delay);
  };

  // Drop the dead socket ourselves: its close handshake can hang as long as the link is gone.
  const watchSilence = () => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (!socket) return;
      socket.onclose = null;
      socket.close();
      reconnectLater();
    }, SILENCE_MS);
  };

  const connect = () => {
    clearTimeout(retryTimer);
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${location.host}/ws`);

    socket.onopen = () => {
      attempt = 0;
      liveFeed.setStatus('live');
      watchSilence();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      watchSilence();
      try {
        const message: unknown = JSON.parse(event.data);
        if (isLiveMessage(message)) liveFeed.receive(message);
      } catch {
        // A malformed frame is dropped; the next one will be fine.
      }
    };

    socket.onclose = reconnectLater;
  };

  // Gone offline: show "Reconnecting" now instead of after the silence timeout.
  window.addEventListener('offline', () => {
    liveFeed.setStatus('reconnecting');
    socket?.close();
  });

  // Back online: do not wait out the backoff.
  window.addEventListener('online', () => {
    if (socket?.readyState === WebSocket.CLOSED) {
      attempt = 0;
      connect();
    }
  });

  document.addEventListener('visibilitychange', () => {
    liveFeed.setPaused('hidden', document.hidden);
  });
  liveFeed.setPaused('hidden', document.hidden);

  connect();
}
