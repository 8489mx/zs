import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthFoundationModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
