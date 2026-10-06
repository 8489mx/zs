import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { DeliveryRepsController } from './delivery-reps.controller';
import { DriverPortalController } from './driver-portal.controller';
import { VanSalesController, VanSalesAdminController } from './van-sales.controller';
import { DeliveryRepsService } from './delivery-reps.service';
import { VanSalesService } from './van-sales.service';
import { VanFleetService } from './services/van-fleet.service';
import { VanRequisitionsService } from './services/van-requisitions.service';
import { VanReturnsService } from './services/van-returns.service';
import { VanTargetsService } from './services/van-targets.service';
import { VanTransfersService } from './services/van-transfers.service';
import { VanRoutesService } from './services/van-routes.service';
import { VanPreSalesService } from './services/van-pre-sales.service';

import { DatabaseModule } from '../../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [AuditModule, DatabaseModule, AccountingModule, SalesModule],
  controllers: [DeliveryRepsController, DriverPortalController, VanSalesController, VanSalesAdminController],
  providers: [
    DeliveryRepsService,
    VanSalesService,
    VanFleetService,
    VanRequisitionsService,
    VanReturnsService,
    VanTargetsService,
    VanTransfersService,
    VanRoutesService,
    VanPreSalesService,
  ],
  exports: [
    DeliveryRepsService,
    VanSalesService,
    VanFleetService,
    VanRequisitionsService,
    VanReturnsService,
    VanTargetsService,
    VanTransfersService,
    VanRoutesService,
    VanPreSalesService,
  ],
})
export class DeliveryRepsModule {}
