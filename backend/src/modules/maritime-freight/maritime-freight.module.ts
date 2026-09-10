import { Module } from '@nestjs/common';
import { MaritimeFreightService } from './maritime-freight.service';
import { MaritimeFreightController } from './maritime-freight.controller';
import { MaritimePublicTrackingController } from './maritime-public-tracking.controller';

@Module({
  controllers: [MaritimeFreightController, MaritimePublicTrackingController],
  providers: [MaritimeFreightService],
  exports: [MaritimeFreightService],
})
export class MaritimeFreightModule {}
