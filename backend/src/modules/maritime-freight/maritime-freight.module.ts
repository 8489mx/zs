import { Module } from '@nestjs/common';
import { MaritimeFreightService } from './maritime-freight.service';
import { MaritimeMailService } from './maritime-mail.service';
import { MaritimeFreightController } from './maritime-freight.controller';
import { MaritimePublicTrackingController } from './maritime-public-tracking.controller';

@Module({
  controllers: [MaritimeFreightController, MaritimePublicTrackingController],
  providers: [MaritimeFreightService, MaritimeMailService],
  exports: [MaritimeFreightService, MaritimeMailService],
})
export class MaritimeFreightModule {}
