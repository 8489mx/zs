import { Module } from '@nestjs/common';
import { MaritimeFreightService } from './maritime-freight.service';
import { MaritimeMailService } from './maritime-mail.service';
import { MaritimeFreightController } from './maritime-freight.controller';
import { MaritimePublicTrackingController } from './maritime-public-tracking.controller';

import { MaritimeAutomationSchedulerService } from './maritime-automation-scheduler.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [MaritimeFreightController, MaritimePublicTrackingController],
  providers: [MaritimeFreightService, MaritimeMailService, MaritimeAutomationSchedulerService],
  exports: [MaritimeFreightService, MaritimeMailService, MaritimeAutomationSchedulerService],
})
export class MaritimeFreightModule {}
