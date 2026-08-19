import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RuntimeHealthController } from './runtime-health.controller';
import { DatabaseMaintenanceService } from './db-maintenance.service';

@Module({
  controllers: [HealthController, RuntimeHealthController],
  providers: [DatabaseMaintenanceService],
  exports: [DatabaseMaintenanceService],
})
export class HealthModule {}
