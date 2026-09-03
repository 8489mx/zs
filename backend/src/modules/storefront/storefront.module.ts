import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SalesModule } from '../sales/sales.module';
import { StorefrontService } from './storefront.service';
import { StorefrontPublicController } from './storefront-public.controller';
import { StorefrontMerchantController } from './storefront-merchant.controller';

@Module({
  imports: [DatabaseModule, SalesModule],
  controllers: [StorefrontPublicController, StorefrontMerchantController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
