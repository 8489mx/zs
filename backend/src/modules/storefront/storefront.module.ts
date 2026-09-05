import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SalesModule } from '../sales/sales.module';
import { StorefrontService } from './storefront.service';
import { StorefrontPaymentService } from './storefront-payment.service';
import { StorefrontPublicController } from './storefront-public.controller';
import { StorefrontMerchantController } from './storefront-merchant.controller';

import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [DatabaseModule, SalesModule, SettingsModule],
  controllers: [StorefrontMerchantController, StorefrontPublicController],
  providers: [StorefrontService, StorefrontPaymentService],
  exports: [StorefrontService, StorefrontPaymentService],
})
export class StorefrontModule {}
