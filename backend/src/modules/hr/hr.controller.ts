import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import {
  LoanRepaymentDto,
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
