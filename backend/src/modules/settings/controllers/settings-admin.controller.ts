import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { SettingsAdminService } from '../services/settings-admin.service';

@Controller('api/admin')
@UseGuards(SessionAuthGuard)
export class SettingsAdminController {
  constructor(private readonly adminService: SettingsAdminService) {}

  @Get('diagnostics')
  getDiagnostics() {
    return this.adminService.getDiagnostics();
  }

  @Get('maintenance-report')
  getMaintenanceReport() {
    return this.adminService.getMaintenanceReport();
  }

  @Get('launch-readiness')
  getLaunchReadiness() {
    return this.adminService.getLaunchReadiness();
  }

  @Get('operational-readiness')
  getOperationalReadiness() {
    return this.adminService.getOperationalReadiness();
  }

  @Get('support-snapshot')
  getSupportSnapshot() {
    return this.adminService.getSupportSnapshot();
  }

  @Get('uat-readiness')
  getUatReadiness() {
    return this.adminService.getUatReadiness();
  }

  @Post('maintenance/cleanup-expired-sessions')
  cleanupExpiredSessions(@Req() req: RequestWithAuth) {
    this.adminService.assertAdmin(req.authContext);
    return this.adminService.cleanupExpiredSessions(req.authContext!);
  }

  @Post('maintenance/reconcile-balances')
  reconcileBalances(@Req() req: RequestWithAuth) {
    this.adminService.assertAdmin(req.authContext);
    return this.adminService.reconcileAll(req.authContext!);
  }

  @Post('maintenance/reconcile-customers')
  reconcileCustomers(@Req() req: RequestWithAuth) {
    this.adminService.assertAdmin(req.authContext);
    return this.adminService.reconcileCustomers(req.authContext!);
  }

  @Post('maintenance/reconcile-suppliers')
  reconcileSuppliers(@Req() req: RequestWithAuth) {
    this.adminService.assertAdmin(req.authContext);
    return this.adminService.reconcileSuppliers(req.authContext!);
  }
}
