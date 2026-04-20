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
  getDiagnostics(@Req() req: RequestWithAuth) {
    return this.adminService.getDiagnostics(req.authContext!);
  }

  @Get('maintenance-report')
  getMaintenanceReport(@Req() req: RequestWithAuth) {
    return this.adminService.getMaintenanceReport(req.authContext!);
  }

  @Get('launch-readiness')
  getLaunchReadiness(@Req() req: RequestWithAuth) {
    return this.adminService.getLaunchReadiness(req.authContext!);
  }

  @Get('operational-readiness')
  getOperationalReadiness(@Req() req: RequestWithAuth) {
    return this.adminService.getOperationalReadiness(req.authContext!);
  }

  @Get('support-snapshot')
  getSupportSnapshot(@Req() req: RequestWithAuth) {
    return this.adminService.getSupportSnapshot(req.authContext!);
  }

  @Get('uat-readiness')
  getUatReadiness(@Req() req: RequestWithAuth) {
    return this.adminService.getUatReadiness(req.authContext!);
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
