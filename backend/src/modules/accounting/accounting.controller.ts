import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
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
} from './dto/accounting.dto';

@Controller('api/accounting')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@RequireFeature('accounting')
@RequireAnyPermission('accounting', 'accounts')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

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

  @Get('opening-balances/preview')
  previewOpeningBalances(@Query() query: OpeningBalancesPreviewQueryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.previewOpeningBalances(query, req.authContext!);
  }

  @Post('opening-balances/post')
  postOpeningBalances(@Body() body: PostOpeningBalancesDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.postOpeningBalances(body, req.authContext!);
  }

  @Get('cost-centers')
  listCostCenters(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listCostCenters(req.authContext!);
  }

  @Post('cost-centers')
  createCostCenter(@Body() body: { code: string; name: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.createCostCenter(body, req.authContext!);
  }

  @Put('cost-centers/:id')
  updateCostCenter(@Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; isActive?: boolean }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.updateCostCenter(id, body, req.authContext!);
  }

  @Delete('cost-centers/:id')
  deleteCostCenter(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.deleteCostCenter(id, req.authContext!);
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

  @Post('fixed-assets/:id/depreciate')
  depreciateFixedAsset(@Param('id', ParseIntPipe) id: number, @Body() body: { months?: number; note?: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.depreciateFixedAsset(id, body, req.authContext!);
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
}


