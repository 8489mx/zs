import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';

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

  @Post(':slug/orders')
  createOrder(@Param('slug') slug: string, @Body() body: CreateOnlineOrderDto) {
    return this.service.createOnlineOrder(slug, body);
  }
}
