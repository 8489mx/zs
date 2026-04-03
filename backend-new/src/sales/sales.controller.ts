import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { HeldSaleDto } from './dto/held-sale.dto';
import { UpsertSaleDto } from './dto/upsert-sale.dto';
import { SalesService } from './sales.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('sales')
  listSales(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.listSales(query, req.authContext!);
  }

  @Get('sales/:id')
  getSale(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.getSaleById(id, req.authContext!);
  }

  @Post('sales')
  @RequirePermissions('sales')
  createSale(@Body() payload: UpsertSaleDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.createSale(payload, req.authContext!);
  }

  @Post('sales/:id/cancel')
  @RequirePermissions('canEditInvoices')
  cancelSale(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.salesService.cancelSale(id, String(body?.reason || ''), req.authContext!);
  }

  @Get('held-sales')
  @RequirePermissions('sales')
  listHeldSales(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.listHeldSales(req.authContext!);
  }

  @Post('held-sales')
  @RequirePermissions('sales')
  saveHeldSale(@Body() payload: HeldSaleDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.saveHeldSale(payload, req.authContext!);
  }

  @Delete('held-sales')
  @RequirePermissions('sales')
  clearHeldSales(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.clearHeldSales(req.authContext!);
  }

  @Delete('held-sales/:id')
  @RequirePermissions('sales')
  deleteHeldSale(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.salesService.deleteHeldSale(id, req.authContext!);
  }
}
