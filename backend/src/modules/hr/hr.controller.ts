import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import {
  BulkSaveAttendanceDto,
  CreateLeaveRequestDto,
  CreatePayrollAdjustmentDto,
  CreatePayrollRunDto,
  DecideAttendanceExceptionDto,
  DecideLeaveRequestDto,
  EmployeeAssetActionDto,
  LoanRepaymentDto,
  UpsertEmployeeAssetDto,
  UpsertLeaveTypeDto,
  UpsertAttendanceRecordDto,
  UpsertPayrollItemDto,
  UpsertCompensationPackageDto,
  UpsertEmployeeContactDto,
  UpsertEmployeeDocumentDto,
  UpsertEmployeeDto,
  UpsertEmployeeLoanDto,
  UpsertEmploymentContractDto,
  UpsertHrMasterDataDto,
} from './dto/hr.dto';
import { HrService } from './hr.service';

@Controller('api/hr')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Get('summary')
  @RequirePermissions('hr')
  summary(@Req() req: RequestWithAuth) {
    return this.hr.summary(req.authContext!);
  }

  @Get('reports/summary')
  @RequirePermissions('hr')
  reportsSummary(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.reportsSummary(query, req.authContext!);
  }

  @Get('attendance')
  @RequirePermissions('hrEmployees')
  listAttendance(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listAttendance(query, req.authContext!);
  }

  @Post('attendance')
  @RequirePermissions('hrEmployees')
  saveAttendanceDay(@Body() payload: BulkSaveAttendanceDto, @Req() req: RequestWithAuth) {
    return this.hr.bulkSaveAttendance(payload, req.authContext!);
  }

  @Post('attendance/record')
  @RequirePermissions('hrEmployees')
  saveAttendanceRecord(@Body() payload: UpsertAttendanceRecordDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertAttendanceRecord(payload, req.authContext!);
  }

  @Get('attendance/exceptions')
  @RequirePermissions('hrEmployees')
  listAttendanceExceptions(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listAttendanceExceptions(query, req.authContext!);
  }

  @Post('attendance/exceptions/:id/approve')
  @RequirePermissions('hrEmployees')
  approveAttendanceException(@Param('id', ParseIntPipe) id: number, @Body() payload: DecideAttendanceExceptionDto, @Req() req: RequestWithAuth) {
    return this.hr.decideAttendanceException(id, 'approved', payload, req.authContext!);
  }

  @Post('attendance/exceptions/:id/skip')
  @RequirePermissions('hrEmployees')
  skipAttendanceException(@Param('id', ParseIntPipe) id: number, @Body() payload: DecideAttendanceExceptionDto, @Req() req: RequestWithAuth) {
    return this.hr.decideAttendanceException(id, 'skipped', payload, req.authContext!);
  }

  @Get('leave-types')
  @RequirePermissions('hrEmployees')
  listLeaveTypes(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listLeaveTypes(query, req.authContext!);
  }

  @Post('leave-types')
  @RequirePermissions('hrEmployees')
  createLeaveType(@Body() payload: UpsertLeaveTypeDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertLeaveType(null, payload, req.authContext!);
  }

  @Put('leave-types/:id')
  @RequirePermissions('hrEmployees')
  updateLeaveType(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertLeaveTypeDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertLeaveType(id, payload, req.authContext!);
  }

  @Get('leave-requests')
  @RequirePermissions('hrEmployees')
  listLeaveRequests(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listLeaveRequests(query, req.authContext!);
  }

  @Post('leave-requests')
  @RequirePermissions('hrEmployees')
  createLeaveRequest(@Body() payload: CreateLeaveRequestDto, @Req() req: RequestWithAuth) {
    return this.hr.createLeaveRequest(payload, req.authContext!);
  }

  @Post('leave-requests/:id/approve')
  @RequirePermissions('hrEmployees')
  approveLeaveRequest(@Param('id', ParseIntPipe) id: number, @Body() payload: DecideLeaveRequestDto, @Req() req: RequestWithAuth) {
    return this.hr.approveLeaveRequest(id, payload, req.authContext!);
  }

  @Post('leave-requests/:id/reject')
  @RequirePermissions('hrEmployees')
  rejectLeaveRequest(@Param('id', ParseIntPipe) id: number, @Body() payload: DecideLeaveRequestDto, @Req() req: RequestWithAuth) {
    return this.hr.rejectLeaveRequest(id, payload, req.authContext!);
  }

  @Post('leave-requests/:id/cancel')
  @RequirePermissions('hrEmployees')
  cancelLeaveRequest(@Param('id', ParseIntPipe) id: number, @Body() payload: DecideLeaveRequestDto, @Req() req: RequestWithAuth) {
    return this.hr.cancelLeaveRequest(id, payload, req.authContext!);
  }

  @Get('assets')
  @RequirePermissions('hrEmployees')
  listEmployeeAssets(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listEmployeeAssets(query, req.authContext!);
  }

  @Post('assets')
  @RequirePermissions('hrEmployees')
  createEmployeeAsset(@Body() payload: UpsertEmployeeAssetDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertEmployeeAsset(null, payload, req.authContext!);
  }

  @Put('assets/:id')
  @RequirePermissions('hrEmployees')
  updateEmployeeAsset(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertEmployeeAssetDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertEmployeeAsset(id, payload, req.authContext!);
  }

  @Post('assets/:id/return')
  @RequirePermissions('hrEmployees')
  returnEmployeeAsset(@Param('id', ParseIntPipe) id: number, @Body() payload: EmployeeAssetActionDto, @Req() req: RequestWithAuth) {
    return this.hr.returnEmployeeAsset(id, payload, req.authContext!);
  }

  @Post('assets/:id/lost')
  @RequirePermissions('hrEmployees')
  markEmployeeAssetLost(@Param('id', ParseIntPipe) id: number, @Body() payload: EmployeeAssetActionDto, @Req() req: RequestWithAuth) {
    return this.hr.markEmployeeAssetLost(id, payload, req.authContext!);
  }

  @Post('assets/:id/damaged')
  @RequirePermissions('hrEmployees')
  markEmployeeAssetDamaged(@Param('id', ParseIntPipe) id: number, @Body() payload: EmployeeAssetActionDto, @Req() req: RequestWithAuth) {
    return this.hr.markEmployeeAssetDamaged(id, payload, req.authContext!);
  }

  @Post('assets/:id/cancel')
  @RequirePermissions('hrEmployees')
  cancelEmployeeAsset(@Param('id', ParseIntPipe) id: number, @Body() payload: EmployeeAssetActionDto, @Req() req: RequestWithAuth) {
    return this.hr.cancelEmployeeAsset(id, payload, req.authContext!);
  }

  @Get('withdrawals')
  @RequirePermissions('hrLoans')
  withdrawals(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.withdrawals(query, req.authContext!);
  }

  @Get('payroll-runs')
  @RequirePermissions('hrPayrollView')
  listPayrollRuns(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listPayrollRuns(query, req.authContext!);
  }

  @Post('payroll-runs')
  @RequirePermissions('hrPayrollManage')
  createPayrollRun(@Body() payload: CreatePayrollRunDto, @Req() req: RequestWithAuth) {
    return this.hr.createPayrollRun(payload, req.authContext!);
  }

  @Get('payroll-runs/:id')
  @RequirePermissions('hrPayrollView')
  getPayrollRun(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.getPayrollRun(id, req.authContext!);
  }

  @Post('payroll-runs/:id/recalculate')
  @RequirePermissions('hrPayrollManage')
  recalculatePayrollRun(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.recalculatePayrollRun(id, req.authContext!);
  }

  @Post('payroll-runs/:id/review')
  @RequirePermissions('hrPayrollManage')
  reviewPayrollRun(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.reviewPayrollRun(id, req.authContext!);
  }

  @Post('payroll-runs/:id/approve')
  @RequirePermissions('hrPayrollApprove')
  approvePayrollRun(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.approvePayrollRun(id, req.authContext!);
  }

  @Post('payroll-runs/:id/cancel')
  @RequirePermissions('hrPayrollManage')
  cancelPayrollRun(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.cancelPayrollRun(id, req.authContext!);
  }

  @Patch('payroll-run-items/:id')
  @RequirePermissions('hrPayrollManage')
  updatePayrollRunItem(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertPayrollItemDto, @Req() req: RequestWithAuth) {
    return this.hr.updatePayrollRunItem(id, payload, req.authContext!);
  }

  @Post('payroll-run-items/:id/adjustments')
  @RequirePermissions('hrPayrollManage')
  createPayrollAdjustment(@Param('id', ParseIntPipe) id: number, @Body() payload: CreatePayrollAdjustmentDto, @Req() req: RequestWithAuth) {
    return this.hr.createPayrollAdjustment(id, payload, req.authContext!);
  }

  @Delete('payroll-item-adjustments/:id')
  @RequirePermissions('hrPayrollManage')
  deletePayrollAdjustment(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.deletePayrollAdjustment(id, req.authContext!);
  }

  @Get('departments')
  @RequirePermissions('hr')
  listDepartments(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listMasterData('departments', query, req.authContext!);
  }

  @Post('departments')
  @RequirePermissions('hr')
  createDepartment(@Body() payload: UpsertHrMasterDataDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertMasterData('departments', null, payload, req.authContext!);
  }

  @Put('departments/:id')
  @RequirePermissions('hr')
  updateDepartment(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertHrMasterDataDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertMasterData('departments', id, payload, req.authContext!);
  }

  @Delete('departments/:id')
  @RequirePermissions('hr')
  deactivateDepartment(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.deactivateMasterData('departments', id, req.authContext!);
  }

  @Get('job-titles')
  @RequirePermissions('hr')
  listJobTitles(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listMasterData('job-titles', query, req.authContext!);
  }

  @Post('job-titles')
  @RequirePermissions('hr')
  createJobTitle(@Body() payload: UpsertHrMasterDataDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertMasterData('job-titles', null, payload, req.authContext!);
  }

  @Put('job-titles/:id')
  @RequirePermissions('hr')
  updateJobTitle(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertHrMasterDataDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertMasterData('job-titles', id, payload, req.authContext!);
  }

  @Delete('job-titles/:id')
  @RequirePermissions('hr')
  deactivateJobTitle(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.deactivateMasterData('job-titles', id, req.authContext!);
  }

  @Get('positions')
  @RequirePermissions('hr')
  listPositions(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listMasterData('positions', query, req.authContext!);
  }

  @Post('positions')
  @RequirePermissions('hr')
  createPosition(@Body() payload: UpsertHrMasterDataDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertMasterData('positions', null, payload, req.authContext!);
  }

  @Put('positions/:id')
  @RequirePermissions('hr')
  updatePosition(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertHrMasterDataDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertMasterData('positions', id, payload, req.authContext!);
  }

  @Delete('positions/:id')
  @RequirePermissions('hr')
  deactivatePosition(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.deactivateMasterData('positions', id, req.authContext!);
  }

  @Get('employees')
  @RequirePermissions('hrEmployees')
  listEmployees(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listEmployees(query, req.authContext!);
  }

  @Post('employees')
  @RequirePermissions('hrEmployees')
  createEmployee(@Body() payload: UpsertEmployeeDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertEmployee(null, payload, req.authContext!);
  }

  @Get('employees/:id')
  @RequirePermissions('hrEmployees')
  employeeProfile(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.getEmployeeProfile(id, req.authContext!);
  }

  @Put('employees/:id')
  @RequirePermissions('hrEmployees')
  updateEmployee(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertEmployeeDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertEmployee(id, payload, req.authContext!);
  }

  @Delete('employees/:id')
  @RequirePermissions('hrEmployees')
  deactivateEmployee(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.deactivateEmployee(id, req.authContext!);
  }

  @Get('employees/:employeeId/contacts')
  @RequirePermissions('hrEmployees')
  listContacts(@Param('employeeId', ParseIntPipe) employeeId: number, @Req() req: RequestWithAuth) {
    return this.hr.listContacts(employeeId, req.authContext!);
  }

  @Post('employees/:employeeId/contacts')
  @RequirePermissions('hrEmployees')
  createContact(@Param('employeeId', ParseIntPipe) employeeId: number, @Body() payload: UpsertEmployeeContactDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertContact(employeeId, null, payload, req.authContext!);
  }

  @Put('employees/:employeeId/contacts/:id')
  @RequirePermissions('hrEmployees')
  updateContact(@Param('employeeId', ParseIntPipe) employeeId: number, @Param('id', ParseIntPipe) id: number, @Body() payload: UpsertEmployeeContactDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertContact(employeeId, id, payload, req.authContext!);
  }

  @Get('employees/:employeeId/documents')
  @RequirePermissions('hrEmployees')
  listDocuments(@Param('employeeId', ParseIntPipe) employeeId: number, @Req() req: RequestWithAuth) {
    return this.hr.listDocuments(employeeId, req.authContext!);
  }

  @Post('employees/:employeeId/documents')
  @RequirePermissions('hrEmployees')
  createDocument(@Param('employeeId', ParseIntPipe) employeeId: number, @Body() payload: UpsertEmployeeDocumentDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertDocument(employeeId, null, payload, req.authContext!);
  }

  @Put('employees/:employeeId/documents/:id')
  @RequirePermissions('hrEmployees')
  updateDocument(@Param('employeeId', ParseIntPipe) employeeId: number, @Param('id', ParseIntPipe) id: number, @Body() payload: UpsertEmployeeDocumentDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertDocument(employeeId, id, payload, req.authContext!);
  }

  @Get('employees/:employeeId/contracts')
  @RequirePermissions('hrContracts')
  listContracts(@Param('employeeId', ParseIntPipe) employeeId: number, @Req() req: RequestWithAuth) {
    return this.hr.listContracts(employeeId, req.authContext!);
  }

  @Post('employees/:employeeId/contracts')
  @RequirePermissions('hrContracts', 'hrSalaryManage')
  createContract(@Param('employeeId', ParseIntPipe) employeeId: number, @Body() payload: UpsertEmploymentContractDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertContract(employeeId, null, payload, req.authContext!);
  }

  @Put('employees/:employeeId/contracts/:id')
  @RequirePermissions('hrContracts', 'hrSalaryManage')
  updateContract(@Param('employeeId', ParseIntPipe) employeeId: number, @Param('id', ParseIntPipe) id: number, @Body() payload: UpsertEmploymentContractDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertContract(employeeId, id, payload, req.authContext!);
  }

  @Get('employees/:employeeId/compensation')
  @RequirePermissions('hrContracts')
  listCompensation(@Param('employeeId', ParseIntPipe) employeeId: number, @Req() req: RequestWithAuth) {
    return this.hr.listCompensation(employeeId, req.authContext!);
  }

  @Post('employees/:employeeId/compensation')
  @RequirePermissions('hrContracts', 'hrSalaryManage')
  createCompensation(@Param('employeeId', ParseIntPipe) employeeId: number, @Body() payload: UpsertCompensationPackageDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertCompensation(employeeId, null, payload, req.authContext!);
  }

  @Put('employees/:employeeId/compensation/:id')
  @RequirePermissions('hrContracts', 'hrSalaryManage')
  updateCompensation(@Param('employeeId', ParseIntPipe) employeeId: number, @Param('id', ParseIntPipe) id: number, @Body() payload: UpsertCompensationPackageDto, @Req() req: RequestWithAuth) {
    return this.hr.upsertCompensation(employeeId, id, payload, req.authContext!);
  }

  @Get('loans')
  @RequirePermissions('hrLoans')
  listLoans(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth) {
    return this.hr.listLoans(query, req.authContext!);
  }

  @Post('loans')
  @RequirePermissions('hrLoans')
  createLoan(@Body() payload: UpsertEmployeeLoanDto, @Req() req: RequestWithAuth) {
    return this.hr.createLoan(payload, req.authContext!);
  }

  @Put('loans/:id')
  @RequirePermissions('hrLoans')
  updateLoan(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertEmployeeLoanDto, @Req() req: RequestWithAuth) {
    return this.hr.updateLoan(id, payload, req.authContext!);
  }

  @Post('loans/:id/approve')
  @RequirePermissions('hrLoans')
  approveLoan(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.approveLoan(id, req.authContext!);
  }

  @Post('loans/:id/disburse')
  @RequirePermissions('hrLoans')
  disburseLoan(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.hr.disburseLoan(id, req.authContext!);
  }

  @Post('loans/:id/repayments')
  @RequirePermissions('hrLoans')
  repayLoan(@Param('id', ParseIntPipe) id: number, @Body() payload: LoanRepaymentDto, @Req() req: RequestWithAuth) {
    return this.hr.repayLoan(id, payload, req.authContext!);
  }

  @Get('employees/:employeeId/ledger')
  @RequirePermissions('hrLoans')
  listLedger(@Param('employeeId', ParseIntPipe) employeeId: number, @Req() req: RequestWithAuth) {
    return this.hr.listLedger(employeeId, req.authContext!);
  }
}
