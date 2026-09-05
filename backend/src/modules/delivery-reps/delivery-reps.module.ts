import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { DeliveryRepsController } from './delivery-reps.controller';
import { DriverPortalController } from './driver-portal.controller';
import { DeliveryRepsService } from './delivery-reps.service';

import { DatabaseModule } from '../../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [AuditModule, DatabaseModule, AccountingModule, SalesModule],
  controllers: [DeliveryRepsController, DriverPortalController],
  providers: [DeliveryRepsService],
})
export class DeliveryRepsModule {}
