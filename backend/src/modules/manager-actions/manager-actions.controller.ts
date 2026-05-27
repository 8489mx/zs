import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { ManagerDashboardService } from './manager-dashboard.service';
import { ManagerActionsService } from './manager-actions.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ManagerActionsController {
  constructor(
    private readonly managerActionsService: ManagerActionsService,
    private readonly managerDashboardService: ManagerDashboardService,
  ) {}

  @Get('manager-actions')
  @RequirePermissions('dashboard')
  list(@Query('limit') limit: string | undefined, @Req() req: RequestWithAuth) {
    return this.managerActionsService.list(Number(limit || 8), req.authContext!);
  }

  @Get('dashboard/manager-overview')
  @RequirePermissions('dashboard')
  managerOverview(@Req() req: RequestWithAuth) {
    return this.managerDashboardService.overview(req.authContext!);
  }
}
