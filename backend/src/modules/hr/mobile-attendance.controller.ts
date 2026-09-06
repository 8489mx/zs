import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import { MobileAttendanceService } from './mobile-attendance.service';

@Controller('api/hr/mobile-punch')
export class MobileAttendanceController {
  constructor(private readonly service: MobileAttendanceService) {}

  @Post('login')
  login(@Body() body: { phone: string; pinCode: string }) {
    return this.service.employeeLogin(body);
  }

  @Get('status')
  getStatus(@Headers('authorization') authHeader: string) {
    const user = this.service.verifyToken(authHeader);
    return this.service.getTodayStatus(user);
  }

  @Post('record')
  recordPunch(
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
    const user = this.service.verifyToken(authHeader);
    return this.service.recordPunch(user, body);
  }

  @Put('branches/:id/geofence')
  updateBranchGeofence(
    @Param('id', ParseIntPipe) branchId: number,
    @Headers('authorization') authHeader: string,
    @Body() body: { latitude: number; longitude: number; geofenceRadiusMeters?: number },
    @Req() req: any,
  ) {
    const tenantId = req.authContext?.tenantId || 'default';
    return this.service.updateBranchGeofence(branchId, tenantId, body);
  }

  @Put('employees/:id/pin')
  setEmployeePin(
    @Param('id', ParseIntPipe) employeeId: number,
    @Body() body: { pinCode: string },
    @Req() req: any,
  ) {
    const tenantId = req.authContext?.tenantId || 'default';
    return this.service.setEmployeePin(employeeId, tenantId, body.pinCode);
  }
}
