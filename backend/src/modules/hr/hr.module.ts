import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { HrTreasuryAdapter } from './hr-treasury.adapter';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule],
  controllers: [HrController],
  providers: [HrService, HrTreasuryAdapter],
})
export class HrModule {}
