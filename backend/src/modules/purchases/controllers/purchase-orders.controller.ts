import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, ReceivePurchaseOrderDto } from '../dto/purchase-order.dto';

@Controller('api/purchase-orders')
@UseGuards(SessionAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  listOrders(
    @Query() query: { status?: string; search?: string; limit?: string; offset?: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.purchaseOrdersService.listOrders(req.authContext!, {
      status: query.status,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
  }

  @Get(':id')
  getOrderById(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.purchaseOrdersService.getOrderById(id, req.authContext!);
  }

  @Post()
  createOrder(@Body() dto: CreatePurchaseOrderDto, @Req() req: RequestWithAuth) {
    return this.purchaseOrdersService.createOrder(dto, req.authContext!);
  }

  @Put(':id')
  updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.purchaseOrdersService.updateOrder(id, dto, req.authContext!);
  }

  @Post(':id/confirm')
  confirmOrder(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.purchaseOrdersService.confirmOrder(id, req.authContext!);
  }

  @Post(':id/receive')
  receiveGoods(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceivePurchaseOrderDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.purchaseOrdersService.receiveGoods(id, dto, req.authContext!);
  }

  @Post(':id/convert-to-bill')
  convertToBill(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.purchaseOrdersService.convertToBill(id, req.authContext!);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.purchaseOrdersService.cancelOrder(id, req.authContext!);
  }

  @Delete(':id')
  deleteOrder(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.purchaseOrdersService.deleteOrder(id, req.authContext!);
  }
}
