import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { AccountingService } from './accounting.service';
import { CashMovementQueryDto, FinancialSummaryQueryDto, InventoryValueQueryDto, JournalEntriesQueryDto, ReceivablesPayablesQueryDto } from './dto/accounting.dto';

@Controller('api/accounting')
@UseGuards(SessionAuthGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  listAccounts(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.listAccounts(req.authContext!);
  }

  @Get('settings')
  getSettings(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.accountingService.getAccountingSettings(req.authContext!);
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
}

