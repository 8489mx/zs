import { Module } from '@nestjs/common';
import { TenantSubscriptionController } from './tenant-subscription.controller';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { PaymentManagerService } from './gateways/payment-manager.service';
import { XPayGatewayService } from './gateways/xpay.gateway';
import { PaymobGatewayService } from './gateways/paymob.gateway';
import { StripeGatewayService } from './gateways/stripe.gateway';

@Module({
  controllers: [TenantSubscriptionController],
  providers: [
    TenantSubscriptionService,
    PaymentManagerService,
    XPayGatewayService,
    PaymobGatewayService,
    StripeGatewayService,
  ],
  exports: [
    TenantSubscriptionService,
    PaymentManagerService,
    XPayGatewayService,
    PaymobGatewayService,
    StripeGatewayService,
  ],
})
export class TenantSubscriptionModule {}
