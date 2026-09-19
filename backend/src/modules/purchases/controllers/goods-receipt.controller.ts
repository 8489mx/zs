import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { GoodsReceiptService } from '../services/goods-receipt.service';
import { CreateGoodsReceiptDto, VerifyThreeWayMatchDto } from '../dto/goods-receipt.dto';

@Controller('api/goods-receipts')
@UseGuards(SessionAuthGuard)
export class GoodsReceiptController {
  constructor(private readonly goodsReceiptService: GoodsReceiptService) {}

  @Get()
  listReceipts(
    @Query() query: { supplierId?: string; status?: string; search?: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.goodsReceiptService.listGoodsReceipts(
      {
        supplierId: query.supplierId ? parseInt(query.supplierId, 10) : undefined,
        status: query.status,
        search: query.search,
      },
      req.authContext!,
    );
  }

  @Get(':id')
  getReceiptById(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.goodsReceiptService.getGoodsReceipt(id, req.authContext!);
  }

  @Post()
  createReceipt(@Body() dto: CreateGoodsReceiptDto, @Req() req: RequestWithAuth) {
    return this.goodsReceiptService.createGoodsReceipt(dto, req.authContext!);
  }

  @Post(':id/post')
  postReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.goodsReceiptService.postGoodsReceipt(id, req.authContext!);
  }

  @Post('purchases/:purchaseId/verify-three-way-match')
  verifyThreeWayMatch(
    @Param('purchaseId', ParseIntPipe) purchaseId: number,
    @Body() dto: VerifyThreeWayMatchDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.goodsReceiptService.verifyPurchaseThreeWayMatch(purchaseId, dto, req.authContext!);
  }
}
