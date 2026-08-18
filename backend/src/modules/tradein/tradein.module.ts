import { Module } from '@nestjs/common';
import { TradeInController } from './tradein.controller';
import { TradeInService } from './tradein.service';

@Module({
  controllers: [TradeInController],
  providers: [TradeInService],
  exports: [TradeInService],
})
export class TradeInModule {}
