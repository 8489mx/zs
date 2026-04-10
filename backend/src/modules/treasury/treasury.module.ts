import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule],
  controllers: [TreasuryController],
  providers: [TreasuryService],
})
export class TreasuryModule {}
