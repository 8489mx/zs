import { Module } from '@nestjs/common';
import { ContractingController } from './contracting.controller';
import { ContractingService } from './contracting.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [ContractingController],
  providers: [ContractingService],
  exports: [ContractingService],
})
export class ContractingModule {}
