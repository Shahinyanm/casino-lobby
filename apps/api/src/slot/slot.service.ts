import { Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import type { SlotMachine, Spin, SpinRequest, SpinResponse } from '@lobby/contracts';
import { IdempotencyLog } from '../common/idempotency';
import { WalletService } from '../wallet/wallet.service';
import { ADVERTISED_RTP, BETS_MINOR, multiplierFor, PAYTABLE, REELS, symbolsAt } from './slot-machine';

/** The server owns every spin: the client only learns the stops and animates them. */
@Injectable()
export class SlotService {
  private readonly spins = new IdempotencyLog<Spin>();

  constructor(private readonly wallet: WalletService) {}

  getMachine(): SlotMachine {
    return {
      reels: REELS,
      paytable: PAYTABLE,
      betsMinor: BETS_MINOR,
      currency: this.wallet.getWallet().currency,
      rtp: ADVERTISED_RTP,
    };
  }

  spin({ betMinor, idempotencyKey }: SpinRequest, randomStop: (length: number) => number = randomInt): SpinResponse {
    const fingerprint = String(betMinor);
    const replay = this.spins.replay(idempotencyKey, fingerprint);

    if (replay) return { spin: replay, wallet: this.wallet.getWallet() };

    const stops = REELS.map((reel) => randomStop(reel.length));
    const winMinor = betMinor * multiplierFor(symbolsAt(stops));
    const wallet = this.wallet.settleSpin(betMinor, winMinor, idempotencyKey);
    const spin: Spin = { id: randomUUID(), betMinor, stops, winMinor };

    this.spins.record(idempotencyKey, fingerprint, spin);

    return { spin, wallet };
  }
}
