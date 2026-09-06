import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../../core/audit/audit.module';
import { SalesModule } from '../sales/sales.module';
import { SettingsModule } from '../settings/settings.module';
import { StorefrontService } from './storefront.service';
import { StorefrontPaymentService } from './storefront-payment.service';
import { StorefrontPublicController } from './storefront-public.controller';
import { StorefrontMerchantController } from './storefront-merchant.controller';
import { MarketplaceSyncService } from './services/marketplace-sync.service';
import { MarketplaceSyncController } from './controllers/marketplace-sync.controller';

@Module({
  imports: [DatabaseModule, AuditModule, SalesModule, SettingsModule],
  controllers: [
    StorefrontMerchantController,
    StorefrontPublicController,
    MarketplaceSyncController,
  ],
  providers: [
    StorefrontService,
    StorefrontPaymentService,
    MarketplaceSyncService,
  ],
  exports: [
    StorefrontService,
    StorefrontPaymentService,
    MarketplaceSyncService,
  ],
})
export class StorefrontModule {}

