import { Module } from '@nestjs/common';
import { ContractingController } from './contracting.controller';
import { ContractingService } from './contracting.service';

@Module({
  controllers: [ContractingController],
  providers: [ContractingService],
  exports: [ContractingService],
})
export class ContractingModule {}
