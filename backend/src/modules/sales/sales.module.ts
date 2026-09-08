import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { AuditModule } from '../../core/audit/audit.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesAuthorizationService } from './services/sales-authorization.service';
import { SalesFinanceService } from './services/sales-finance.service';
import { SalesQueryService } from './services/sales-query.service';
import { SalesWriteService } from './services/sales-write.service';
import { QuotationsController } from './controllers/quotations.controller';
import { QuotationsService } from './services/quotations.service';
import { PosTerminalController } from './controllers/pos-terminal.controller';
import { PosTerminalService } from './services/pos-terminal.service';

import { CustomerInstallmentsController } from './controllers/customer-installments.controller';
import { CustomerInstallmentsService } from './services/customer-installments.service';
import { CashierFraudRadarController } from './controllers/cashier-fraud-radar.controller';
import { CashierFraudRadarService } from './services/cashier-fraud-radar.service';
import { KdsController } from './controllers/kds.controller';
import { KdsService } from './services/kds.service';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { PriceListsController } from './controllers/price-lists.controller';
import { PriceListsService } from './services/price-lists.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule, AccountingModule, SettingsModule],
  controllers: [
    PriceListsController,
    PosTerminalController,
    QuotationsController,
    SalesOrdersController,
    CustomerInstallmentsController,
    CashierFraudRadarController,
    KdsController,
    SalesController,
  ],
  providers: [
    SalesService,
    SalesAuthorizationService,
    SalesFinanceService,
    SalesQueryService,
    SalesWriteService,
    QuotationsService,
    SalesOrdersService,
    PriceListsService,
    PosTerminalService,
    CustomerInstallmentsService,
    CashierFraudRadarService,
    KdsService,
  ],
  exports: [
    SalesService,
    SalesFinanceService,
    QuotationsService,
    SalesOrdersService,
    PriceListsService,
    PosTerminalService,
    CustomerInstallmentsService,
    CashierFraudRadarService,
    KdsService,
  ],
})
export class SalesModule {}


