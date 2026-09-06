import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { DeliveryRepsController } from './delivery-reps.controller';
import { DriverPortalController } from './driver-portal.controller';
import { VanSalesController, VanSalesAdminController } from './van-sales.controller';
import { DeliveryRepsService } from './delivery-reps.service';
import { VanSalesService } from './van-sales.service';

import { DatabaseModule } from '../../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [AuditModule, DatabaseModule, AccountingModule, SalesModule],
  controllers: [DeliveryRepsController, DriverPortalController, VanSalesController, VanSalesAdminController],
  providers: [DeliveryRepsService, VanSalesService],
  exports: [DeliveryRepsService, VanSalesService],
})
export class DeliveryRepsModule {}

