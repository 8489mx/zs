import { Controller, Get, Post, Body, Req, Param, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../core/auth/decorators/permissions.decorator';
import { EtaSubmissionService } from '../../services/eta-submission/eta-submission.service';
import { RequestWithAuth } from '../../../../core/auth/interfaces/request-with-auth.interface';

@Controller('api/tax-integration/eta/invoices')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class EtaInvoicesController {
  constructor(private readonly etaSubmissionService: EtaSubmissionService) {}

  @Get('pending')
  @RequirePermissions('sales')
  async getPendingInvoices(@Req() req: RequestWithAuth) {
    const invoices = await this.etaSubmissionService.getPendingInvoices(String(req.authContext!.tenantId));
    return {
      success: true,
      data: invoices
    };
  }

  @Post('submit')
  @RequirePermissions('canEditInvoices')
  async submitInvoices(@Req() req: RequestWithAuth, @Body() body: { invoiceIds: string[] }) {
    const result = await this.etaSubmissionService.submitInvoices(String(req.authContext!.tenantId), body.invoiceIds);
    return result;
  }

  @Get('status/:submissionId')
  @RequirePermissions('sales')
  async getSubmissionStatus(@Req() req: RequestWithAuth, @Param('submissionId') submissionId: string) {
    return this.etaSubmissionService.checkSubmissionStatus(String(req.authContext!.tenantId), submissionId);
  }

  @Get('doc/:uuid')
  @RequirePermissions('sales')
  async getDocumentDetails(@Req() req: RequestWithAuth, @Param('uuid') uuid: string) {
    return this.etaSubmissionService.getDocumentDetails(String(req.authContext!.tenantId), uuid);
  }
}


