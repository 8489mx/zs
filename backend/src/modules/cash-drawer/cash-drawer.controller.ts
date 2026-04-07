import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CashDrawerService } from './cash-drawer.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class CashDrawerController {
  constructor(private readonly cashDrawerService: CashDrawerService) {}

  @Get('cashier-shifts')
  @RequirePermissions('cashDrawer')
  list(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.cashDrawerService.listCashierShifts(query, req.authContext!);
  }

  @Post('cashier-shifts/open')
  @RequirePermissions('cashDrawer')
  open(
    @Body() payload: { openingCash?: number; note?: string; branchId?: number | string | null; locationId?: number | string | null },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.cashDrawerService.openCashierShift(payload, req.authContext!);
  }

  @Post('cashier-shifts/:id/cash-movement')
  @RequirePermissions('cashDrawer')
  movement(
    @Param('id') id: string,
    @Body() payload: { type?: string; amount?: number; note?: string; managerPin?: string },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.cashDrawerService.recordCashMovement(Number(id || 0), payload, req.authContext!);
  }

  @Post('cashier-shifts/:id/close')
  @RequirePermissions('cashDrawer')
  close(
    @Param('id') id: string,
    @Body() payload: { countedCash?: number; note?: string; managerPin?: string },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.cashDrawerService.closeCashierShift(Number(id || 0), payload, req.authContext!);
  }
}
