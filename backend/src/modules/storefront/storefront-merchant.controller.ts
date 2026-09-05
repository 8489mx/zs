import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { UpdateStorefrontSettingsDto } from './dto/update-storefront-settings.dto';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from './dto/delivery-zone.dto';

@Controller('api/storefront/admin')
@UseGuards(SessionAuthGuard)
export class StorefrontMerchantController {
  constructor(private readonly service: StorefrontService) {}

  @Get('orders')
  listOrders(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.service.listOrders(query, req.authContext!);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.service.getOrder(id, req.authContext!);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('saleId') saleId: number | undefined,
    @Req() req: RequestWithAuth,
  ) {
    return this.service.updateOrderStatus(id, status, req.authContext!, saleId ? Number(saleId) : undefined);
  }

  @Post('orders/:id/convert-to-sale')
  convertToSale(
    @Param('id', ParseIntPipe) id: number,
    @Body('deliveryRepId') deliveryRepId: number | undefined,
    @Req() req: RequestWithAuth,
  ) {
    return this.service.convertToSale(id, req.authContext!, deliveryRepId);
  }

  @Post('orders/:id/prepare-pos')
  prepareOrderForPos(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.service.prepareOrderForPos(id, req.authContext!);
  }

  @Get('settings')
  getSettings(@Req() req: RequestWithAuth) {
    return this.service.getStorefrontSettings(req.authContext!);
  }

  @Post('settings')
  updateSettings(@Body() payload: UpdateStorefrontSettingsDto, @Req() req: RequestWithAuth) {
    return this.service.updateStorefrontSettings(payload, req.authContext!);
  }

  @Patch('products/:id/image')
  updateProductImage(
    @Param('id', ParseIntPipe) id: number,
    @Body('imageUrl') imageUrl: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.service.updateProductImage(id, imageUrl || '', req.authContext!);
  }

  @Patch('categories/:id/image')
  updateCategoryImage(
    @Param('id', ParseIntPipe) id: number,
    @Body('imageUrl') imageUrl: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.service.updateCategoryImage(id, imageUrl || '', req.authContext!);
  }

  @Get('coupons')
  listCoupons(@Req() req: RequestWithAuth) {
    return this.service.listCoupons(req.authContext!);
  }

  @Post('coupons')
  createCoupon(@Body() body: CreateCouponDto, @Req() req: RequestWithAuth) {
    return this.service.createCoupon(body, req.authContext!);
  }

  @Put('coupons/:id')
  updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCouponDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.service.updateCoupon(id, body, req.authContext!);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.service.deleteCoupon(id, req.authContext!);
  }

  @Get('delivery-zones')
  listDeliveryZones(@Req() req: RequestWithAuth) {
    return this.service.listDeliveryZones(req.authContext!);
  }

  @Post('delivery-zones')
  createDeliveryZone(@Body() body: CreateDeliveryZoneDto, @Req() req: RequestWithAuth) {
    return this.service.createDeliveryZone(body, req.authContext!);
  }

  @Put('delivery-zones/:id')
  updateDeliveryZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDeliveryZoneDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.service.updateDeliveryZone(id, body, req.authContext!);
  }

  @Delete('delivery-zones/:id')
  deleteDeliveryZone(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.service.deleteDeliveryZone(id, req.authContext!);
  }
}
