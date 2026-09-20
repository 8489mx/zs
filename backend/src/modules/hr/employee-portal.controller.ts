import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { EmployeePortalService } from './employee-portal.service';

/**
 * بوابة الموظف: مسارات عامة لا تمر على `SessionAuthGuard` (الموظف ليس مستخدم نظام).
 * الهوية تأتي حصراً من رمز HMAC موقّع، ونطاق المستأجر يُشتق من الرمز بعد التحقق
 * منه أمام قاعدة البيانات — لا يُقرأ من جسم الطلب إطلاقاً.
 */
@Controller('api/hr/portal')
export class EmployeePortalController {
  constructor(private readonly service: EmployeePortalService) {}

  @Post('login')
  login(@Body() body: { identifier: string; pinCode: string; companyCode?: string; tenantId?: string }) {
    return this.service.login(body);
  }

  @Get('dashboard')
  async getDashboard(@Headers('authorization') authHeader: string) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.getDashboard(user.employeeId, user.tenantId);
  }

  @Get('attendance')
  async getAttendance(
    @Headers('authorization') authHeader: string,
    @Query('month') month?: string,
  ) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.getAttendance(user.employeeId, user.tenantId, month);
  }

  @Get('payslips')
  async getPayslips(@Headers('authorization') authHeader: string) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.getPayslips(user.employeeId, user.tenantId);
  }

  @Get('leaves')
  async getLeaves(@Headers('authorization') authHeader: string) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.getLeaves(user.employeeId, user.tenantId);
  }

  @Post('leaves/request')
  async requestLeave(
    @Headers('authorization') authHeader: string,
    @Body() body: { leaveTypeId: number; startDate: string; endDate: string; reason?: string },
  ) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.requestLeave(user.employeeId, user.tenantId, user.accountId, body);
  }

  @Get('loans-and-custody')
  async getLoansAndCustody(@Headers('authorization') authHeader: string) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.getLoansAndCustody(user.employeeId, user.tenantId);
  }

  @Post('loans/request')
  async requestAdvance(
    @Headers('authorization') authHeader: string,
    @Body() body: { amount: number; reason: string; repaymentMonths?: number },
  ) {
    const user = await this.service.verifyToken(authHeader);
    return this.service.requestAdvance(user.employeeId, user.tenantId, user.accountId, body);
  }
}
