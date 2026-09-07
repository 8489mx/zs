import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { EmployeePortalService } from './employee-portal.service';

@Controller('api/hr/portal')
export class EmployeePortalController {
  constructor(private readonly service: EmployeePortalService) {}

  @Post('login')
  login(@Body() body: { identifier: string; pinCode: string; companyCode?: string; tenantId?: string }) {
    return this.service.login(body);
  }

  @Get('dashboard')
  getDashboard(@Headers('authorization') authHeader: string) {
    const user = this.service.verifyToken(authHeader);
    return this.service.getDashboard(user.employeeId, user.tenantId);
  }

  @Get('attendance')
  getAttendance(
    @Headers('authorization') authHeader: string,
    @Query('month') month?: string,
  ) {
    const user = this.service.verifyToken(authHeader);
    return this.service.getAttendance(user.employeeId, month);
  }

  @Get('payslips')
  getPayslips(@Headers('authorization') authHeader: string) {
    const user = this.service.verifyToken(authHeader);
    return this.service.getPayslips(user.employeeId);
  }

  @Get('leaves')
  getLeaves(@Headers('authorization') authHeader: string) {
    const user = this.service.verifyToken(authHeader);
    return this.service.getLeaves(user.employeeId);
  }

  @Post('leaves/request')
  requestLeave(
    @Headers('authorization') authHeader: string,
    @Body() body: { leaveTypeId: number; startDate: string; endDate: string; reason?: string },
  ) {
    const user = this.service.verifyToken(authHeader);
    return this.service.requestLeave(user.employeeId, user.tenantId, body);
  }

  @Get('loans-and-custody')
  getLoansAndCustody(@Headers('authorization') authHeader: string) {
    const user = this.service.verifyToken(authHeader);
    return this.service.getLoansAndCustody(user.employeeId);
  }

  @Post('loans/request')
  requestAdvance(
    @Headers('authorization') authHeader: string,
    @Body() body: { amount: number; reason: string; repaymentMonths?: number },
  ) {
    const user = this.service.verifyToken(authHeader);
    return this.service.requestAdvance(user.employeeId, user.tenantId, body);
  }
}
