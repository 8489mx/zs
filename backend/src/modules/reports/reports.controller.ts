import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { ReportRangeQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/overview')
  @RequirePermissions('dashboard')
  dashboardOverview(@Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.dashboardOverview(query);
  }

  @Get('reports/summary')
  @RequirePermissions('reports')
  reportSummary(@Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.reportSummary(query);
  }

  @Get('reports/inventory')
  @RequirePermissions('reports')
  reportInventory(@Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.inventoryReport(query);
  }

  @Get('reports/customer-balances')
  @RequirePermissions('reports')
  customerBalances(@Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.customerBalances(query);
  }

  @Get('reports/supplier-balances')
  @RequirePermissions('reports')
  supplierBalances(@Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.supplierBalances(query);
  }

  @Get('reports/customers/:id/ledger')
  @RequirePermissions('reports')
  customerLedger(@Param('id', ParseIntPipe) id: number, @Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.customerLedger(id, query);
  }

  @Get('reports/suppliers/:id/ledger')
  @RequirePermissions('reports')
  supplierLedger(@Param('id', ParseIntPipe) id: number, @Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.supplierLedger(id, query);
  }

  @Get('treasury-transactions')
  @RequirePermissions('treasury')
  treasury(@Query() query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsService.treasuryTransactions(query);
  }


  @Get('reports/employees')
  @RequirePermissions('reports')
  employeeSummary(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.employeeSummary(query, req.authContext!);
  }

  @Get('reports/employees/:id/details')
  @RequirePermissions('reports')
  employeeDetails(@Param('id', ParseIntPipe) id: number, @Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.employeeDetails(id, query, req.authContext!);
  }

  @Get('audit-logs')
  @RequirePermissions('audit')
  auditLogs(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.auditLogs(query, req.authContext!);
  }
}
