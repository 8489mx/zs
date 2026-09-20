import { Body, Controller, Get, Header, Headers, Param, Post, Put, Query, Req } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StorefrontPaymentService } from './storefront-payment.service';
import { StorefrontSocialPreviewService } from './storefront-social-preview.service';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { RecordAbandonedCartDto } from './dto/abandoned-cart.dto';

@Controller('api/storefront')
export class StorefrontPublicController {
  constructor(
    private readonly service: StorefrontService,
    private readonly paymentService: StorefrontPaymentService,
    private readonly socialPreviewService: StorefrontSocialPreviewService,
  ) {}

  @Get(':slug/info')
  getInfo(@Param('slug') slug: string) {
    return this.service.getStorefrontInfo(slug);
  }

  @Get(':slug/catalog')
  getCatalog(@Param('slug') slug: string) {
    return this.service.getStorefrontCatalog(slug);
  }

  /**
   * بطاقة المعاينة لزواحف التواصل (واتساب/فيسبوك/تليجرام/جوجل).
   * بوابة nginx وحدها هي من توجّه الزواحف إلى هنا — المستخدم يُخدَّم التطبيق.
   */
  @Get(':slug/social-preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  socialPreview(@Param('slug') slug: string, @Req() req: RequestWithAuth) {
    return this.socialPreviewService.buildPreview(slug, this.resolveOrigin(req));
  }

  @Get(':slug/social-preview/:productId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  socialPreviewProduct(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.socialPreviewService.buildPreview(slug, this.resolveOrigin(req), productId);
  }

  /** يبني الأصل من رؤوس الوكيل حتى تكون روابط og:url مطلقة وصحيحة خلف nginx. */
  private resolveOrigin(req: RequestWithAuth): string {
    const configured = String(process.env.APP_PUBLIC_URL || '').trim();
    if (configured) return configured.replace(/\/$/, '');
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    return host ? `${proto}://${host}` : '';
  }

  @Get(':slug/search/suggest')
  getSearchSuggestions(
    @Param('slug') slug: string,
    @Query('q') q: string,
  ) {
    return this.service.getSearchSuggestions(slug, q);
  }

  @Get(':slug/products/:productId')
  getProductDetails(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
  ) {
    return this.service.getProductDetails(slug, Number(productId));
  }

  @Get(':slug/tables-qr')
  getTablesQr(
    @Param('slug') slug: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Headers('host') host?: string,
  ) {
    const baseUrl = host ? `http://${host}` : undefined;
    return this.service.getTablesQrCodes(slug, Number(from || 1), Number(to || 20), baseUrl);
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

  @Post(':slug/abandoned-cart')
  recordAbandonedCart(
    @Param('slug') slug: string,
    @Body() body: RecordAbandonedCartDto,
  ) {
    return this.service.recordAbandonedCart(slug, body);
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
    @Req() req: RequestWithAuth,
  ) {
    return this.paymentService.processPaymobWebhook(headers, body, (req as any)?.rawBody);
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
    @Req() req: RequestWithAuth,
  ) {
    return this.paymentService.processXPayWebhook(headers, body, (req as any)?.rawBody);
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
    @Req() req: RequestWithAuth,
  ) {
    return this.paymentService.processTapWebhook(headers, body, (req as any)?.rawBody);
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
    @Req() req: RequestWithAuth,
  ) {
    return this.paymentService.processStripeWebhook(headers, body, (req as any)?.rawBody);
  }
}


