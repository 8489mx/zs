import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CashDrawerService } from './cash-drawer.service';
import { CashMovementDto } from './dto/cash-movement.dto';
import { CloseCashierShiftDto } from './dto/close-cashier-shift.dto';
import { OpenCashierShiftDto } from './dto/open-cashier-shift.dto';

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
    @Body() payload: OpenCashierShiftDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.cashDrawerService.openCashierShift(payload, req.authContext!);
  }

  @Post('cashier-shifts/:id/cash-movement')
  @RequirePermissions('cashDrawer')
  movement(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CashMovementDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.cashDrawerService.recordCashMovement(id, payload, req.authContext!);
  }

  @Post('cashier-shifts/:id/close')
  @RequirePermissions('cashDrawer')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CloseCashierShiftDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.cashDrawerService.closeCashierShift(id, payload, req.authContext!);
  }
}
