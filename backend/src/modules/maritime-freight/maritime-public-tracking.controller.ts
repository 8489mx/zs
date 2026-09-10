import { Controller, Get, Param } from '@nestjs/common';
import { MaritimeFreightService } from './maritime-freight.service';

@Controller(['public/freight-tracking', 'api/public/freight-tracking'])
export class MaritimePublicTrackingController {
  constructor(private readonly freightService: MaritimeFreightService) {}

  @Get(':token')
  async getPublicTracking(@Param('token') token: string) {
    return this.freightService.getPublicTrackingByToken(token);
  }
}
