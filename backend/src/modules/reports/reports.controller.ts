import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions, RequireAnyPermission } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { ReportRangeQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';
import { DynamicPivotService } from './services/dynamic-pivot.service';
import { DailyCommercialRollupService } from './services/daily-commercial-rollup.service';
import { ExecuteDynamicPivotDto, SavePivotTemplateDto } from './dto/dynamic-pivot.dto';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pivotService: DynamicPivotService,
    private readonly rollupService: DailyCommercialRollupService,
  ) {}

  @Get('dashboard/overview')
  @RequirePermissions('dashboard')
  dashboardOverview(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.dashboardOverview(query, req.authContext!);
  }

  @Get('reports/summary')
  @RequirePermissions('reports')
  reportSummary(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.reportSummary(query, req.authContext!);
  }

  @Get('reports/inventory')
  @RequirePermissions('reports')
  reportInventory(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.inventoryReport(query, req.authContext!);
  }

  @Get('reports/inventory/dead-stock')
  @RequirePermissions('reports')
  deadStockReport(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.deadStockReport(query, req.authContext!);
  }

  @Get('reports/customers/rfm')
  @RequirePermissions('reports')
  customerRfmReport(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.customerRfmReport(query, req.authContext!);
  }

  @Get('reports/customer-balances')
  @RequireAnyPermission('reports', 'accounts')
  customerBalances(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.customerBalances(query, req.authContext!);
  }

  @Get('reports/supplier-balances')
  @RequireAnyPermission('reports', 'accounts')
  supplierBalances(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.supplierBalances(query, req.authContext!);
  }

  @Get('reports/customers/:id/ledger')
  @RequireAnyPermission('reports', 'accounts')
  customerLedger(@Param('id', ParseIntPipe) id: number, @Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.customerLedger(id, query, req.authContext!);
  }

  @Get('reports/suppliers/:id/ledger')
  @RequireAnyPermission('reports', 'accounts')
  supplierLedger(@Param('id', ParseIntPipe) id: number, @Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.supplierLedger(id, query, req.authContext!);
  }

  @Get('treasury-transactions')
  @RequirePermissions('treasury')
  treasury(@Query() query: ReportRangeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.treasuryTransactions(query, req.authContext!);
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

  @Get('reports/debt-aging')
  @RequireAnyPermission('reports', 'accounts')
  debtAging(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.debtAgingReport(req.authContext!);
  }

  @Get('reports/demand-forecasting')
  @RequireAnyPermission('reports', 'inventory')
  demandForecasting(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.reportsService.demandForecastingReport(req.authContext!);
  }

  @Post('reports/pivot/execute')
  @RequireAnyPermission('reports', 'dashboard', 'sales', 'accounting')
  executePivot(
    @Body() dto: ExecuteDynamicPivotDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.pivotService.executePivot(req.authContext!, dto);
  }

  @Get('reports/pivot/templates')
  @RequireAnyPermission('reports', 'dashboard', 'sales', 'accounting')
  getSavedTemplates(
    @Query('dataset') dataset: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.pivotService.getSavedTemplates(req.authContext!, dataset);
  }

  @Post('reports/pivot/templates')
  @RequireAnyPermission('reports', 'dashboard', 'sales', 'accounting')
  savePivotTemplate(
    @Body() dto: SavePivotTemplateDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.pivotService.saveTemplate(req.authContext!, dto);
  }

  @Delete('reports/pivot/templates/:id')
  @RequireAnyPermission('reports', 'dashboard', 'sales', 'accounting')
  deletePivotTemplate(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.pivotService.deleteTemplate(req.authContext!, id);
  }

  @Get('reports/rollups/multi-year-comparison')
  @RequireAnyPermission('reports', 'dashboard')
  multiYearRollupComparison(
    @Query('years') yearsParam: string,
    @Query('branchId') branchId: string,
    @Req() req: RequestWithAuth,
  ) {
    const years = (yearsParam || '')
      .split(',')
      .map((y) => parseInt(y.trim(), 10))
      .filter((y) => !isNaN(y) && y >= 2020 && y <= 2040);
    const targetYears = years.length > 0 ? years : [new Date().getFullYear() - 1, new Date().getFullYear()];
    const branch = branchId ? parseInt(branchId, 10) : undefined;
    return this.rollupService.getHistoricalMultiYearComparison(req.authContext!.tenantId!, targetYears, branch);
  }

  @Post('reports/rollups/compute-day')
  @RequirePermissions('reports')
  computeDayRollup(
    @Body('date') date: string,
    @Body('branchId') branchId: number,
    @Req() req: RequestWithAuth,
  ) {
    const targetDate = (date || new Date().toISOString().slice(0, 10)).trim();
    return this.rollupService.computeAndStoreDailyRollup(req.authContext!.tenantId!, targetDate, branchId);
  }
}
