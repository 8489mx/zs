import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { UpsertTradeInDto } from './dto/upsert-tradein.dto';
import { TradeInService } from './tradein.service';

@Controller('api/tradein/transactions')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class TradeInController {
  constructor(private readonly tradeInService: TradeInService) {}

  @Get()
  @RequirePermissions('canViewPurchases')
  listTransactions(
    @Req() req: RequestWithAuth,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.tradeInService.listTransactions(req.authContext!, {
      q,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 25,
    });
  }

  @Get(':id')
  @RequirePermissions('canViewPurchases')
  getTransaction(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.tradeInService.getTransaction(id, req.authContext!);
  }

  @Post()
  @RequirePermissions('canCreatePurchases')
  createTransaction(@Body() payload: UpsertTradeInDto, @Req() req: RequestWithAuth) {
    return this.tradeInService.createTransaction(payload, req.authContext!);
  }

  @Delete(':id')
  @RequirePermissions('canManageProducts')
  deleteTransaction(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.tradeInService.deleteTransaction(id, req.authContext!);
  }
}
