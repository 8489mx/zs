import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { PaymentManagerService } from './gateways/payment-manager.service';
import { InitiateOnlinePaymentDto, RequestRenewalDto } from './dto/tenant-subscription.dto';

@Controller('api/tenant-subscription')
export class TenantSubscriptionController {
  constructor(
    private readonly service: TenantSubscriptionService,
    private readonly paymentManager: PaymentManagerService,
  ) {}

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getMySubscription(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.service.getMySubscription(req.authContext!);
  }

  @Post('request-renewal')
  @UseGuards(SessionAuthGuard)
  requestRenewal(@Body() dto: RequestRenewalDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.service.requestRenewal(dto, req.authContext!);
  }

  @Post('initiate-online-payment')
  @UseGuards(SessionAuthGuard)
  initiateOnlinePayment(@Body() dto: InitiateOnlinePaymentDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.service.initiateOnlinePayment(dto, this.paymentManager, req.authContext!);
  }

  /**
   * Public Webhook endpoint for payment gateways (XPay, Paymob, Stripe, Fawry)
   * e.g. POST /api/tenant-subscription/webhooks/xpay
   * e.g. POST /api/tenant-subscription/webhooks/paymob
   */
  @Post('webhooks/:gateway')
  handlePaymentWebhook(
    @Param('gateway') gateway: string,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ): Promise<Record<string, unknown>> {
    return this.paymentManager.processWebhook(gateway, headers, body);
  }
}
