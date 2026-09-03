import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { UpdateStorefrontSettingsDto } from './dto/update-storefront-settings.dto';

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
    @Req() req: RequestWithAuth,
  ) {
    return this.service.updateOrderStatus(id, status, req.authContext!);
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
}
