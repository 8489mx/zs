import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { AccountingController } from './accounting.controller';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingService } from './accounting.service';
import { AccountingTenantFoundationService } from './accounting-tenant-foundation.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingPostingService, AccountingTenantFoundationService],
  exports: [AccountingService, AccountingPostingService, AccountingTenantFoundationService],
})
export class AccountingModule {}

