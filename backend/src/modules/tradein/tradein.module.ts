import { Module } from '@nestjs/common';
import { TradeInController } from './tradein.controller';
import { TradeInService } from './tradein.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [TradeInController],
  providers: [TradeInService],
  exports: [TradeInService],
})
export class TradeInModule {}
