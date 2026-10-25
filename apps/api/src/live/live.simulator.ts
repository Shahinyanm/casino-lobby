import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Subject } from 'rxjs';
import type { LiveMessage, Win } from '@lobby/contracts';
import { CatalogService } from '../catalog/catalog.service';

const PLAYERS = [
  'Noa', 'Liam', 'Maya', 'Ariel', 'Yael', 'Daniel', 'Tamar', 'Omer', 'Shira', 'Ethan',
  'Lior', 'Mia', 'Itai', 'Roni', 'Adam', 'Emma', 'Yoav', 'Sofia', 'Amit', 'Leah',
];
const INITIALS = 'ABDEGKLMNRST';
const HISTORY = 12;
export const JACKPOT_TICK_MS = 2000;

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Fakes the casino's event bus: other players' wins and a growing progressive jackpot. */
@Injectable()
export class LiveSimulator implements OnModuleInit, OnModuleDestroy {
  readonly messages$ = new Subject<LiveMessage>();
  private jackpotMinor = 123_456_789;
  private recent: Win[] = [];
  private winTimer?: NodeJS.Timeout;
  private jackpotTimer?: NodeJS.Timeout;

  constructor(private readonly catalog: CatalogService) {}

  onModuleInit() {
    this.scheduleWin();
    this.jackpotTimer = setInterval(() => {
      this.jackpotMinor += Math.round(between(500, 8_000));
      this.messages$.next({ type: 'jackpot', jackpotMinor: this.jackpotMinor });
    }, JACKPOT_TICK_MS);
  }

  onModuleDestroy() {
    clearTimeout(this.winTimer);
    clearInterval(this.jackpotTimer);
    this.messages$.complete();
  }

  snapshot(): LiveMessage {
    return { type: 'snapshot', jackpotMinor: this.jackpotMinor, wins: this.recent };
  }

  private scheduleWin() {
    this.winTimer = setTimeout(() => {
      const win = this.randomWin();
      this.recent = [win, ...this.recent].slice(0, HISTORY);
      this.messages$.next({ type: 'win', win });
      this.scheduleWin();
    }, between(600, 2500));
  }

  private randomWin(): Win {
    const games = this.catalog.all();
    const game = games[Math.floor(Math.random() * games.length)];
    if (!game) throw new Error('Catalog is empty');

    // Log-normal amounts: mostly small wins, a long tail of big ones, a rare huge hit.
    const normal = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    const big = Math.random() < 0.03 ? between(20, 100) : 1;
    const amountMinor = Math.max(100, Math.round(Math.exp(normal * 1.1 + 3.4) * big * 100));
    const player = PLAYERS[Math.floor(Math.random() * PLAYERS.length)] ?? 'Guest';
    const initial = INITIALS[Math.floor(Math.random() * INITIALS.length)] ?? 'A';

    return {
      id: randomUUID(),
      player: `${player} ${initial}.`,
      avatarHue: Math.floor(Math.random() * 360),
      gameId: game.id,
      gameTitle: game.title,
      amountMinor,
      currency: 'USD',
      at: new Date().toISOString(),
    };
  }
}
