import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { ImportSalesController } from './import-sales.controller';
import { ImportSalesService } from './import-sales.service';

@Module({
  imports: [AccountingModule],
  controllers: [ImportSalesController],
  providers: [ImportSalesService],
  exports: [ImportSalesService],
})
export class ImportSalesModule {}
