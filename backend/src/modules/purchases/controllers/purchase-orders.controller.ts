import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto/purchase-order.dto';

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

  // NOTE: direct goods-receiving for purchase orders was removed here (O3 audit finding).
  // It wrote stock via a path that never created a `goods_receipt_notes` row, never posted
  // a GRNI journal entry, and never ran `computeThreeWayMatch` — a live bypass of the
  // hardened three-way-match/accounting pipeline. It also had zero frontend callers.
  // The real, hardened receiving flow is `convertToBill` below (which creates a formal
  // `purchases` bill) followed by `POST /api/purchases/:id/receive-goods`
  // (`purchases.service.ts:receivePurchaseGoods`), which is GRN/GRNI/3-way-match backed.

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
