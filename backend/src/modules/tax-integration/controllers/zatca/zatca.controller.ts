import { Controller, Get, Post, Body, Req, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SessionAuthGuard } from '../../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../../../core/auth/interfaces/request-with-auth.interface';
import { ZatcaPhase2Service } from '../../services/zatca/zatca-phase2.service';

@Controller('api/tax-integration/zatca')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ZatcaController {
  constructor(private readonly zatcaService: ZatcaPhase2Service) {}

  @Get('invoice/:id')
  @RequirePermissions('sales')
  async getZatcaPackage(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const tenantId = String(req.authContext!.tenantId);
    const result = await this.zatcaService.buildZatcaInvoice(tenantId, Number(id));
    return {
      success: true,
      data: result
    };
  }

  @Get('invoice/:id/xml')
  @RequirePermissions('sales')
  async getZatcaXml(@Req() req: RequestWithAuth, @Param('id') id: string, @Res() res: Response) {
    const tenantId = String(req.authContext!.tenantId);
    const result = await this.zatcaService.buildZatcaInvoice(tenantId, Number(id));
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="zatca-invoice-${id}.xml"`);
    res.send(result.ublXml);
  }

  @Get('invoice/:id/qr')
  @RequirePermissions('sales')
  async getZatcaQr(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const tenantId = String(req.authContext!.tenantId);
    const result = await this.zatcaService.buildZatcaInvoice(tenantId, Number(id));
    return {
      success: true,
      data: {
        qrCodeBase64: result.qrCodeBase64,
        invoiceHash: result.invoiceHash,
        digitalSignature: result.digitalSignature
      }
    };
  }

  @Post('compliance-check')
  @RequirePermissions('sales')
  async validateCompliance(@Body() body: any) {
    const validation = this.zatcaService.validateCompliance(body);
    return {
      success: validation.valid,
      errors: validation.errors
    };
  }
}
