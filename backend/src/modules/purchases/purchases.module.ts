import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchasesFinanceService } from './services/purchases-finance.service';
import { PurchasesQueryService } from './services/purchases-query.service';
import { PurchasesWriteService } from './services/purchases-write.service';
import { SupplierPaymentSchedulesService } from './services/supplier-payment-schedules.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule, AccountingModule],
  controllers: [PurchasesController],
  providers: [
    PurchasesService,
    PurchasesFinanceService,
    PurchasesQueryService,
    PurchasesWriteService,
    SupplierPaymentSchedulesService,
  ],
})
export class PurchasesModule {}
