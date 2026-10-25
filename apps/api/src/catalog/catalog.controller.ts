import { Controller, Get, NotFoundException, Param, Res, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import type { CatalogResponse } from '@lobby/contracts';
import { MockLatency } from '../common/mock-latency.interceptor';
import { CatalogService } from './catalog.service';
import { renderThumbnail } from './thumbnail';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('games')
  @UseInterceptors(new MockLatency(500, 1200))
  getGames(): CatalogResponse {
    return this.catalog.getCatalog();
  }

  @Get('thumbs/:file')
  getThumbnail(@Param('file') file: string, @Res({ passthrough: true }) res: Response): string {
    const game = this.catalog.findGame(file.replace(/\.svg$/, ''));
    if (!game) throw new NotFoundException(`No thumbnail for ${file}`);

    // Set only on success: with @Header a 404 went out as an SVG cached for a year.
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return renderThumbnail(game);
  }
}
