import { Controller, Get, Post, Body, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { WhatsAppGatewayService, WhatsAppConfig } from '../services/whatsapp-gateway.service';

@Controller('api/settings/whatsapp')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class WhatsAppGatewayController {
  constructor(private readonly whatsappService: WhatsAppGatewayService) {}

  @Get()
  @RequirePermissions('canManageSettings')
  getConfig(@Req() req: RequestWithAuth): Promise<WhatsAppConfig> {
    return this.whatsappService.getConfig(req.authContext!);
  }

  @Post()
  @RequirePermissions('canManageSettings')
  saveConfig(@Body() payload: Partial<WhatsAppConfig>, @Req() req: RequestWithAuth): Promise<{ ok: boolean }> {
    return this.whatsappService.saveConfig(payload, req.authContext!);
  }

  @Post('test')
  @RequirePermissions('canManageSettings')
  sendTestMessage(@Body('phone') phone: string, @Req() req: RequestWithAuth): Promise<{ success: boolean; message?: string }> {
    return this.whatsappService.sendTestMessage(phone, req.authContext!);
  }

  @Post('send-invoice/:saleId')
  @RequirePermissions('sales')
  sendInvoice(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Req() req: RequestWithAuth,
  ): Promise<{ success: boolean; message?: string }> {
    return this.whatsappService.sendInvoiceNotification(saleId, req.authContext!);
  }
}
