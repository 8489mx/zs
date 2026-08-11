import { Module } from '@nestjs/common';
import { ImportSalesController } from './import-sales.controller';
import { ImportSalesService } from './import-sales.service';

@Module({
  controllers: [ImportSalesController],
  providers: [ImportSalesService],
  exports: [ImportSalesService],
})
export class ImportSalesModule {}
