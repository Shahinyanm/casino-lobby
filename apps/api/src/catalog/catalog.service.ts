import { Injectable } from '@nestjs/common';
import type { CatalogResponse, Game } from '@lobby/contracts';
import { PROVIDERS, generateCatalog } from './catalog.data';

@Injectable()
export class CatalogService {
  private readonly games = generateCatalog();
  private readonly byId = new Map(this.games.map((game) => [game.id, game]));

  getCatalog(): CatalogResponse {
    return { currency: 'USD', games: this.games, providers: PROVIDERS };
  }

  findGame(id: string): Game | undefined {
    return this.byId.get(id);
  }

  all(): readonly Game[] {
    return this.games;
  }
}
