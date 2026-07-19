import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RuntimeHealthController } from './runtime-health.controller';

@Module({
  controllers: [HealthController, RuntimeHealthController],
})
export class HealthModule {}
