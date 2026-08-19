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

  @Get('projects')
  listProjects(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listProjects(req.authContext!);
  }
}

