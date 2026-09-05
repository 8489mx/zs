import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';

@Controller('api/storefront')
export class StorefrontPublicController {
  constructor(private readonly service: StorefrontService) {}

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
}


