import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RuntimeHealthController } from './runtime-health.controller';
import { DatabaseMaintenanceService } from './db-maintenance.service';
import { TelegramAlertsService } from '../alerts/telegram-alerts.service';

@Module({
  controllers: [HealthController, RuntimeHealthController],
  providers: [DatabaseMaintenanceService, TelegramAlertsService],
  exports: [DatabaseMaintenanceService, TelegramAlertsService],
})
export class HealthModule {}
