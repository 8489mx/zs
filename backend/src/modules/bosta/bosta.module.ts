import { Module } from '@nestjs/common';
import { BostaController } from './bosta.controller';
import { BostaService } from './bosta.service';

@Module({
  controllers: [BostaController],
  providers: [BostaService],
  exports: [BostaService],
})
export class BostaModule {}
