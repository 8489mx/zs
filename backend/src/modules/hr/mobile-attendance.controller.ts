import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { MobileAttendanceService } from './mobile-attendance.service';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

@Controller('api/hr/mobile-punch')
export class MobileAttendanceController {
  constructor(private readonly service: MobileAttendanceService) {}

  @Post('login')
  login(@Body() body: { phone: string; pinCode: string; companyCode?: string; tenantId?: string }) {
    return this.service.employeeLogin(body);
  }

  @Get('status')
  async getStatus(@Headers('authorization') authHeader: string) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.getTodayStatus(user);
  }

  @Post('record')
  async recordPunch(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      type: 'check_in' | 'check_out';
      latitude: number;
      longitude: number;
      selfieDataUrl?: string;
      notes?: string;
    },
  ) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.recordPunch(user, body);
  }

  @Put('branches/:id/geofence')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermissions('hrAttendance')
  updateBranchGeofence(
    @Param('id', ParseIntPipe) branchId: number,
    @Body() body: { latitude: number; longitude: number; geofenceRadiusMeters?: number },
    @Req() req: RequestWithAuth,
  ) {
    const { tenantId } = requireTenantScope(req.authContext);
    return this.service.updateBranchGeofence(branchId, tenantId, body);
  }

  @Put('employees/:id/pin')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermissions('hrAttendance')
  setEmployeePin(
    @Param('id', ParseIntPipe) employeeId: number,
    @Body() body: { pinCode: string },
    @Req() req: RequestWithAuth,
  ) {
    const { tenantId } = requireTenantScope(req.authContext);
    return this.service.setEmployeePin(employeeId, tenantId, body.pinCode);
  }
}
