import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { PosTerminalService, TerminalPaymentRequest } from '../services/pos-terminal.service';

@Controller('api/sales/pos/terminals')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PosTerminalController {
  constructor(private readonly terminalService: PosTerminalService) {}

  @Get()
  @RequirePermissions('sales')
  async getTerminals(@Req() req: RequestWithAuth) {
    const terminals = await this.terminalService.getTerminals(String(req.authContext!.tenantId));
    return {
      success: true,
      data: terminals
    };
  }

  @Post('charge')
  @RequirePermissions('sales')
  async initiateCharge(@Req() req: RequestWithAuth, @Body() body: TerminalPaymentRequest) {
    const session = await this.terminalService.initiatePayment(String(req.authContext!.tenantId), body);
    return {
      success: true,
      data: session
    };
  }

  @Get('status/:transactionId')
  @RequirePermissions('sales')
  async checkStatus(@Param('transactionId') transactionId: string) {
    const session = await this.terminalService.getPaymentStatus(transactionId);
    return {
      success: true,
      data: session
    };
  }

  @Post('cancel/:transactionId')
  @RequirePermissions('sales')
  async cancelCharge(@Param('transactionId') transactionId: string) {
    const session = await this.terminalService.cancelPayment(transactionId);
    return {
      success: true,
      data: session
    };
  }
}
