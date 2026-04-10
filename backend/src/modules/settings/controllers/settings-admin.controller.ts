import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { AdminRoleGuard } from '../../../core/auth/guards/admin-role.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { SettingsAdminService } from '../services/settings-admin.service';

@Controller('api/admin')
@UseGuards(SessionAuthGuard, AdminRoleGuard)
export class SettingsAdminController {
  constructor(private readonly adminService: SettingsAdminService) {}

  @Get('diagnostics')
  getDiagnostics(@Req() _req: RequestWithAuth) {
    return this.adminService.getDiagnostics();
  }

  @Get('maintenance-report')
  getMaintenanceReport(@Req() _req: RequestWithAuth) {
    return this.adminService.getMaintenanceReport();
  }

  @Get('launch-readiness')
  getLaunchReadiness(@Req() _req: RequestWithAuth) {
    return this.adminService.getLaunchReadiness();
  }

  @Get('operational-readiness')
  getOperationalReadiness(@Req() _req: RequestWithAuth) {
    return this.adminService.getOperationalReadiness();
  }

  @Get('support-snapshot')
  getSupportSnapshot(@Req() _req: RequestWithAuth) {
    return this.adminService.getSupportSnapshot();
  }

  @Get('uat-readiness')
  getUatReadiness(@Req() _req: RequestWithAuth) {
    return this.adminService.getUatReadiness();
  }

  @Post('maintenance/cleanup-expired-sessions')
  cleanupExpiredSessions(@Req() req: RequestWithAuth) {
    return this.adminService.cleanupExpiredSessions(req.authContext!);
  }

  @Post('maintenance/reconcile-balances')
  reconcileBalances(@Req() req: RequestWithAuth) {
    return this.adminService.reconcileAll(req.authContext!);
  }

  @Post('maintenance/reconcile-customers')
  reconcileCustomers(@Req() req: RequestWithAuth) {
    return this.adminService.reconcileCustomers(req.authContext!);
  }

  @Post('maintenance/reconcile-suppliers')
  reconcileSuppliers(@Req() req: RequestWithAuth) {
    return this.adminService.reconcileSuppliers(req.authContext!);
  }
}
