import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { LiveGateway } from './live/live.gateway';
import { LiveSimulator } from './live/live.simulator';
import { PromotionsController } from './promotions/promotions.controller';
import { SlotController } from './slot/slot.controller';
import { SlotService } from './slot/slot.service';
import { WalletController } from './wallet/wallet.controller';
import { WalletService } from './wallet/wallet.service';

const WEB_DIST = join(__dirname, '..', '..', 'web', 'dist');

// `npm start` serves the built SPA from the same origin; `npm run dev` uses Vite's proxy instead.
const staticSite = existsSync(WEB_DIST)
  ? [
      ServeStaticModule.forRoot({
        rootPath: WEB_DIST,
        exclude: ['/api/{*path}'],
        serveStaticOptions: {
          setHeaders: (res: Response, path: string) => {
            // Hashed bundles never change; index.html and the service worker must always revalidate.
            res.setHeader('Cache-Control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
          },
        },
      }),
    ]
  : [];

@Module({
  imports: staticSite,
  controllers: [CatalogController, PromotionsController, WalletController, SlotController],
  providers: [CatalogService, WalletService, SlotService, LiveSimulator, LiveGateway],
})
export class AppModule {}
