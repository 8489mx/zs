import { Module } from '@nestjs/common';
import { GccShippingController } from './gcc-shipping.controller';
import { GccShippingService } from './gcc-shipping.service';

@Module({
  controllers: [GccShippingController],
  providers: [GccShippingService],
  exports: [GccShippingService],
})
export class GccShippingModule {}
