import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StorefrontPaymentService } from './storefront-payment.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';

@Controller('api/storefront')
export class StorefrontPublicController {
  constructor(
    private readonly service: StorefrontService,
    private readonly paymentService: StorefrontPaymentService,
  ) {}

  @Get(':slug/info')
  getInfo(@Param('slug') slug: string) {
    return this.service.getStorefrontInfo(slug);
  }

  @Get(':slug/catalog')
  getCatalog(@Param('slug') slug: string) {
    return this.service.getStorefrontCatalog(slug);
  }

  @Post(':slug/products/:productId/reviews')
  submitProductReview(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
    @Body() body: CreateProductReviewDto,
  ) {
    return this.service.submitProductReview(slug, Number(productId), body);
  }

  @Get(':slug/products/:productId/reviews')
  getProductReviews(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
  ) {
    return this.service.getProductReviews(slug, Number(productId));
  }

  @Post(':slug/coupons/validate')
  validateCoupon(
    @Param('slug') slug: string,
    @Body() body: { code: string; subtotal: number },
  ) {
    return this.service.validateCoupon(slug, body.code, Number(body.subtotal || 0));
  }

  @Post(':slug/orders')
  createOrder(@Param('slug') slug: string, @Body() body: CreateOnlineOrderDto) {
    return this.service.createOnlineOrder(slug, body);
  }

  @Get(':slug/orders')
  getCustomerOrders(
    @Param('slug') slug: string,
    @Query('phone') phone?: string,
    @Query('orderNumbers') orderNumbers?: string,
  ) {
    const list = orderNumbers ? orderNumbers.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return this.service.listCustomerOrders(slug, phone, list);
  }

  @Post(':slug/orders/:orderNumber/cancel')
  cancelCustomerOrder(
    @Param('slug') slug: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.service.cancelCustomerOrder(slug, orderNumber);
  }

  @Put(':slug/orders/:orderNumber')
  updateCustomerOrder(
    @Param('slug') slug: string,
    @Param('orderNumber') orderNumber: string,
    @Body() body: CreateOnlineOrderDto,
  ) {
    return this.service.updateCustomerOrder(slug, orderNumber, body);
  }

  // --- Online Payment Gateway Endpoints ---

  @Post(':slug/orders/:orderNumber/payment-session')
  createPaymentSession(
    @Param('slug') slug: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.paymentService.initiatePaymentSession(slug, orderNumber);
  }

  @Get(':slug/orders/:orderNumber/payment-status')
  getPaymentStatus(
    @Param('slug') slug: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.paymentService.getOrderPaymentStatus(slug, orderNumber);
  }

  @Post(':slug/orders/:orderNumber/mock-pay')
  mockPayOrder(
    @Param('slug') slug: string,
    @Param('orderNumber') orderNumber: string,
    @Body() body: { cardNumber?: string; cardHolder?: string },
  ) {
    return this.paymentService.processMockPayment(slug, orderNumber, body);
  }

  @Post('webhooks/paymob')
  handlePaymobWebhook(
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    return this.paymentService.processPaymobWebhook(headers, body);
  }

  @Get('webhooks/paymob')
  handlePaymobCallback(
    @Query() query: Record<string, any>,
  ) {
    return { ok: true, message: 'Paymob callback processed', query };
  }

  @Post('webhooks/xpay')
  handleXPayWebhook(
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    return this.paymentService.processXPayWebhook(headers, body);
  }

  @Get('webhooks/xpay')
  handleXPayCallback(
    @Query() query: Record<string, any>,
  ) {
    return { ok: true, message: 'XPay callback received', query };
  }

  @Post('webhooks/tap')
  handleTapWebhook(
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    return this.paymentService.processTapWebhook(headers, body);
  }

  @Get('webhooks/tap-callback')
  handleTapCallback(
    @Query() query: Record<string, any>,
  ) {
    return { ok: true, message: 'Tap callback received', query };
  }

  @Post('webhooks/stripe')
  handleStripeWebhook(
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    return this.paymentService.processStripeWebhook(headers, body);
  }
}


