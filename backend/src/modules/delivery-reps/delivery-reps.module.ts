import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { DeliveryRepsController } from './delivery-reps.controller';
import { DeliveryRepsService } from './delivery-reps.service';

import { DatabaseModule } from '../../database/database.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [AuditModule, DatabaseModule, AccountingModule, SalesModule],
  controllers: [DeliveryRepsController],
  providers: [DeliveryRepsService],
})
export class DeliveryRepsModule {}
