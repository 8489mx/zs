import { Module } from '@nestjs/common';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CashDrawerController } from './cash-drawer.controller';
import { CashDrawerService } from './cash-drawer.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule, AccountingModule],
  controllers: [CashDrawerController],
  providers: [CashDrawerService],
})
export class CashDrawerModule {}
