import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { AccountingController } from './accounting.controller';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingService } from './accounting.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingPostingService],
  exports: [AccountingService, AccountingPostingService],
})
export class AccountingModule {}

