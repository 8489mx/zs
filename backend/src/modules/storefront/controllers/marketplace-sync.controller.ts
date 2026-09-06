import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import {
  MarketplaceSyncService,
  AmazonConfig,
  NoonConfig,
  MarketplaceSkuMapping,
} from '../services/marketplace-sync.service';

@Controller('api/storefront/marketplaces')
@UseGuards(SessionAuthGuard)
export class MarketplaceSyncController {
  constructor(private readonly syncService: MarketplaceSyncService) {}

  @Get('config')
  getConfig(@Req() req: RequestWithAuth) {
    return this.syncService.getConfig(req.authContext!);
  }

  @Post('config')
  saveConfig(
    @Body() payload: { amazon?: Partial<AmazonConfig>; noon?: Partial<NoonConfig> },
    @Req() req: RequestWithAuth,
  ) {
    return this.syncService.saveConfig(payload, req.authContext!);
  }

  @Post('test-connection')
  testConnection(@Body('marketplace') marketplace: 'amazon' | 'noon', @Req() req: RequestWithAuth) {
    return this.syncService.testConnection(marketplace, req.authContext!);
  }

  @Get('mappings')
  getMappings(@Req() req: RequestWithAuth) {
    return this.syncService.getMappings(req.authContext!);
  }

  @Post('mappings')
  saveMapping(
    @Body() payload: Omit<MarketplaceSkuMapping, 'id'> & { id?: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.syncService.saveMapping(payload, req.authContext!);
  }

  @Delete('mappings/:id')
  deleteMapping(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.syncService.deleteMapping(id, req.authContext!);
  }

  @Post('sync-inventory')
  syncInventory(@Query('marketplace') marketplace: 'amazon' | 'noon' | undefined, @Req() req: RequestWithAuth) {
    return this.syncService.syncInventory(req.authContext!, marketplace);
  }

  @Post('simulate-order')
  simulateOrder(@Body('marketplace') marketplace: 'amazon' | 'noon', @Req() req: RequestWithAuth) {
    const target = marketplace === 'noon' ? 'noon' : 'amazon';
    return this.syncService.simulateIncomingOrder(target, req.authContext!);
  }
}
