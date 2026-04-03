import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { AuthFoundationModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ConfigAccessModule } from './config/config-access.module';

@Module({
  imports: [
    AppConfigModule,
    ConfigAccessModule,
    LoggingModule,
    DatabaseModule,
    AuthFoundationModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppModule {}
