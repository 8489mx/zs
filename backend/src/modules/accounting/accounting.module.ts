import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { AccountingController } from './accounting.controller';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingService } from './accounting.service';
import { AccountingTenantFoundationService } from './accounting-tenant-foundation.service';
import { BalanceSheetService } from './services/balance-sheet.service';
import { CashFlowService } from './services/cash-flow.service';
import { AgedDebtsService } from './services/aged-debts.service';
import { PdcChequesService } from './services/pdc-cheques.service';
import { WithholdingTaxService } from './services/withholding-tax.service';
import { PaymentAllocationService } from './services/payment-allocation.service';
import { FiscalYearService } from './services/fiscal-year.service';
import { FixedAssetsSchedulerService } from './services/fixed-assets-scheduler.service';
import { CostCenterAllocationsService } from './services/cost-center-allocations.service';
import { ForexRevaluationService } from './services/forex-revaluation.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [AccountingController],
  providers: [
    AccountingService,
    AccountingPostingService,
    AccountingTenantFoundationService,
    BalanceSheetService,
    CashFlowService,
    AgedDebtsService,
    PdcChequesService,
    WithholdingTaxService,
    PaymentAllocationService,
    FiscalYearService,
    FixedAssetsSchedulerService,
    CostCenterAllocationsService,
    ForexRevaluationService,
  ],
  exports: [
    AccountingService,
    AccountingPostingService,
    AccountingTenantFoundationService,
    BalanceSheetService,
    CashFlowService,
    AgedDebtsService,
    PdcChequesService,
    WithholdingTaxService,
    PaymentAllocationService,
    FiscalYearService,
    FixedAssetsSchedulerService,
    CostCenterAllocationsService,
    ForexRevaluationService,
  ],
})
export class AccountingModule {}

