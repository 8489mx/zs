import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { RequireAnyPermission, RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { RequireFeature } from '../../core/auth/decorators/feature.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { AccountingService } from './accounting.service';
import {
  CashMovementQueryDto,
  FinancialSummaryQueryDto,
  InventoryValueQueryDto,
  JournalEntriesQueryDto,
  OpeningBalancesPreviewQueryDto,
  PostOpeningBalancesDto,
  ReceivablesPayablesQueryDto,
  CreateAccountDto,
  UpdateAccountDto,
  GenerateCodeQueryDto,
  UpdateAccountingSettingsDto,
  CreateManualJournalEntryDto,
  CreateBankStatementDto,
  ReconcileMatchDto,
  CreateBankFeeAdjustmentDto,
} from './dto/accounting.dto';

import { BalanceSheetService } from './services/balance-sheet.service';
import { CashFlowService } from './services/cash-flow.service';
import { AgedDebtsService } from './services/aged-debts.service';
import { PdcChequesService, CreatePdcChequeDto, UpdateChequeStatusDto } from './services/pdc-cheques.service';
import { WithholdingTaxService, CreateWhtTransactionDto, ExtractFromPurchasesDto } from './services/withholding-tax.service';

@Controller('api/accounting')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@RequireFeature('accounting')
@RequireAnyPermission('accounting', 'accounts')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly cashFlowService: CashFlowService,
    private readonly agedDebtsService: AgedDebtsService,
    private readonly pdcChequesService: PdcChequesService,
    private readonly withholdingTaxService: WithholdingTaxService,
  ) {}

  @Get('accounts')
  listAccounts(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listAccounts(req.authContext!);
  }

  @Post('accounts')
  createAccount(@Body() dto: CreateAccountDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.createAccount(dto, req.authContext!);
  }

  @Put('accounts/:id')
  updateAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.updateAccount(id, dto, req.authContext!);
  }

  @Delete('accounts/:id')
  deleteAccount(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.deleteAccount(id, req.authContext!);
  }

  @Get('accounts/generate-code')
  generateNextAccountCode(@Query() query: GenerateCodeQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.generateNextAccountCode(query.parentId, req.authContext!);
  }

  @Get('settings')
  getSettings(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getAccountingSettings(req.authContext!);
  }

  @Put('settings')
  updateSettings(@Body() dto: UpdateAccountingSettingsDto, @Req() req: RequestWithAuth): Promise<{ success: boolean }> {
    return this.accountingService.updateAccountingSettings(dto, req.authContext!);
  }

  @Get('journal-entries')
  listJournalEntries(@Query() query: JournalEntriesQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listJournalEntries(query, req.authContext!);
  }

  @Post('journal-entries')
  createJournalEntry(@Body() dto: CreateManualJournalEntryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.createManualJournalEntry(dto, req.authContext!);
  }

  @Get('journal-entries/:id')
  getJournalEntry(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getJournalEntry(id, req.authContext!);
  }

  @Get('reports/financial-summary')
  getFinancialSummary(@Query() query: FinancialSummaryQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getFinancialSummary(query, req.authContext!);
  }

  @Get('reports/receivables-payables')
  getReceivablesPayables(@Query() query: ReceivablesPayablesQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getReceivablesPayables(query, req.authContext!);
  }

  @Get('reports/cash-movement')
  getCashMovement(@Query() query: CashMovementQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getCashMovement(query, req.authContext!);
  }

  @Get('reports/inventory-value')
  getInventoryValue(@Query() query: InventoryValueQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getInventoryValue(query, req.authContext!);
  }

  // --- Big Financial Statements (IFRS / Odoo 17 Standards) ---
  @Get('reports/balance-sheet')
  getBalanceSheet(
    @Query('asOfDate') asOfDate: string,
    @Query('compareDate') compareDate: string,
    @Query('branchId') branchId: string,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.balanceSheetService.getBalanceSheet(req.authContext!, {
      asOfDate: asOfDate || undefined,
      compareDate: compareDate || undefined,
      branchId: branchId ? Number(branchId) : undefined,
    });
  }

  @Get('reports/cash-flow')
  getCashFlow(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('branchId') branchId: string,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.cashFlowService.getCashFlowStatement(req.authContext!, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      branchId: branchId ? Number(branchId) : undefined,
    });
  }

  @Get('reports/aged-receivables')
  getAgedReceivables(
    @Query('asOfDate') asOfDate: string,
    @Query('branchId') branchId: string,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.agedDebtsService.getAgedReceivables(req.authContext!, {
      asOfDate: asOfDate || undefined,
      branchId: branchId ? Number(branchId) : undefined,
    });
  }

  @Get('reports/aged-payables')
  getAgedPayables(
    @Query('asOfDate') asOfDate: string,
    @Query('branchId') branchId: string,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.agedDebtsService.getAgedPayables(req.authContext!, {
      asOfDate: asOfDate || undefined,
      branchId: branchId ? Number(branchId) : undefined,
    });
  }

  @Get('opening-balances/preview')
  previewOpeningBalances(@Query() query: OpeningBalancesPreviewQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.previewOpeningBalances(query, req.authContext!);
  }

  @Post('opening-balances/post')
  postOpeningBalances(@Body() body: PostOpeningBalancesDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.postOpeningBalances(body, req.authContext!);
  }

  @Get('cost-centers')
  listCostCenters(@Req() req: RequestWithAuth): Promise<{ ok: boolean; costCenters: Record<string, unknown>[] }> {
    return this.accountingService.listCostCenters(req.authContext!);
  }

  @Post('cost-centers')
  createCostCenter(
    @Body() body: { code: string; name: string; dimension?: string; budgetAmount?: number; parentId?: number | null; description?: string; isActive?: boolean },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.accountingService.createCostCenter(body, req.authContext!);
  }

  @Put('cost-centers/:id')
  updateCostCenter(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { code?: string; name?: string; dimension?: string; budgetAmount?: number; parentId?: number | null; description?: string; isActive?: boolean },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.accountingService.updateCostCenter(id, body, req.authContext!);
  }

  @Delete('cost-centers/:id')
  deleteCostCenter(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.deleteCostCenter(id, req.authContext!);
  }

  @Get('cost-centers/:id/report')
  getCostCenterReport(
    @Param('id', ParseIntPipe) id: number,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.accountingService.getCostCenterReport(id, req.authContext!, { fromDate, toDate });
  }

  @Get('projects')
  listProjects(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listProjects(req.authContext!);
  }

  // --- Fixed Assets & Depreciation (الأصول الثابتة والإهلاك) ---
  @Get('fixed-assets')
  listFixedAssets(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listFixedAssets(req.authContext!);
  }

  @Post('fixed-assets')
  createFixedAsset(@Body() body: any, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.createFixedAsset(body, req.authContext!);
  }

  @Delete('fixed-assets/:id')
  deleteFixedAsset(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.deleteFixedAsset(id, req.authContext!);
  }

  @Post('fixed-assets/depreciate-all')
  depreciateAllFixedAssets(@Body() body: { months?: number; note?: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.depreciateAllFixedAssets(body, req.authContext!);
  }

  @Post('fixed-assets/:id/depreciate')
  depreciateFixedAsset(@Param('id', ParseIntPipe) id: number, @Body() body: { months?: number; note?: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.depreciateFixedAsset(id, body, req.authContext!);
  }

  @Get('fixed-assets/logs')
  listAllAssetDepreciationLogs(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listAssetDepreciationLogs(undefined, req.authContext!);
  }

  @Get('fixed-assets/:id/logs')
  listAssetDepreciationLogs(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listAssetDepreciationLogs(id, req.authContext!);
  }

  // --- Multi-Currency (العملات المتعددة وأسعار الصرف) ---
  @Get('currencies')
  listCurrencies(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listCurrencies(req.authContext!);
  }

  @Post('currencies')
  upsertCurrency(@Body() body: { currencyCode: string; currencyName: string; exchangeRate: number; isBase?: boolean; symbol?: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.upsertCurrency(body, req.authContext!);
  }

  @Post('currencies/convert')
  convertCurrency(@Body() body: { amount: number; fromCurrency: string; toCurrency: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.convertCurrency(body, req.authContext!);
  }

  // --- Bank Reconciliation Engine (التسويات البنكية ومطابقة كشوف الحساب) ---
  @Get('bank-statements')
  listBankStatements(@Query('accountId') accountId: string, @Req() req: RequestWithAuth): Promise<any[]> {
    return this.accountingService.listBankStatements(req.authContext!, accountId ? Number(accountId) : undefined);
  }

  @Get('bank-statements/:id')
  getBankStatement(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<any> {
    return this.accountingService.getBankStatement(id, req.authContext!);
  }

  @Post('bank-statements')
  createBankStatement(@Body() dto: CreateBankStatementDto, @Req() req: RequestWithAuth): Promise<any> {
    return this.accountingService.createBankStatement(dto, req.authContext!);
  }

  @Get('bank-statements/:id/workspace')
  getBankReconciliationWorkspace(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<any> {
    return this.accountingService.getBankReconciliationWorkspace(id, req.authContext!);
  }

  @Post('bank-statements/reconcile')
  reconcileMatch(@Body() dto: ReconcileMatchDto, @Req() req: RequestWithAuth): Promise<any> {
    return this.accountingService.reconcileMatch(dto, req.authContext!);
  }

  @Post('bank-statements/unreconcile')
  unreconcileMatch(@Body('statementLineId', ParseIntPipe) statementLineId: number, @Req() req: RequestWithAuth): Promise<any> {
    return this.accountingService.unreconcileMatch(statementLineId, req.authContext!);
  }

  @Post('bank-statements/fee-adjustment')
  createBankFeeAdjustment(@Body() dto: CreateBankFeeAdjustmentDto, @Req() req: RequestWithAuth): Promise<any> {
    return this.accountingService.createBankFeeAdjustment(dto, req.authContext!);
  }

  // --- PDC Cheques Management (حافظة الشيكات وأوراق القبض والدفع) ---
  @Get('cheques')
  listCheques(
    @Query('type') type: 'receivable' | 'payable',
    @Query('status') status: string,
    @Query('search') search: string,
    @Query('dueFrom') dueFrom: string,
    @Query('dueTo') dueTo: string,
    @Query('partnerId') partnerId: string,
    @Query('bankName') bankName: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.pdcChequesService.listCheques(req.authContext!, {
      type: type || undefined,
      status: status || undefined,
      search: search || undefined,
      dueFrom: dueFrom || undefined,
      dueTo: dueTo || undefined,
      partnerId: partnerId ? Number(partnerId) : undefined,
      bankName: bankName || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('cheques/stats')
  getChequesStats(@Req() req: RequestWithAuth): Promise<any> {
    return this.pdcChequesService.getStats(req.authContext!);
  }

  @Post('cheques')
  createCheque(@Body() dto: CreatePdcChequeDto, @Req() req: RequestWithAuth): Promise<any> {
    return this.pdcChequesService.createCheque(req.authContext!, dto);
  }

  @Patch('cheques/:id/status')
  updateChequeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChequeStatusDto,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.pdcChequesService.updateChequeStatus(req.authContext!, id, dto);
  }

  @Delete('cheques/:id')
  deleteCheque(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<any> {
    return this.pdcChequesService.deleteCheque(req.authContext!, id);
  }

  // --- Withholding Tax (WHT) & Egyptian Form 41 (ضريبة الخصم والإضافة ونموذج 41 ضرائب) ---
  @Get('withholding-tax/form-41')
  getForm41Report(
    @Query('year') year: string,
    @Query('quarter') quarter: string,
    @Query('direction') direction: 'payable' | 'receivable',
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.withholdingTaxService.getForm41Report(req.authContext!, {
      year: year ? Number(year) : undefined,
      quarter: quarter || undefined,
      direction: direction || undefined,
    });
  }

  @Post('withholding-tax')
  createWhtTransaction(
    @Body() dto: CreateWhtTransactionDto,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.withholdingTaxService.createTransaction(req.authContext!, dto);
  }

  @Post('withholding-tax/extract-from-purchases')
  extractWhtFromPurchases(
    @Body() dto: ExtractFromPurchasesDto,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.withholdingTaxService.extractFromPurchases(req.authContext!, dto);
  }

  @Patch('withholding-tax/:id/status')
  updateWhtStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { status: 'draft' | 'declared' | 'paid'; payment_reference?: string },
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.withholdingTaxService.updateStatus(req.authContext!, id, dto);
  }

  @Delete('withholding-tax/:id')
  deleteWhtTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithAuth,
  ): Promise<any> {
    return this.withholdingTaxService.deleteTransaction(req.authContext!, id);
  }
}


