import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { TreasuryService } from './treasury.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('expenses')
  @RequirePermissions('treasury')
  listExpenses(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.treasuryService.listExpenses(query, req.authContext!);
  }

  @Post('expenses')
  @RequirePermissions('treasury')
  createExpense(@Body() payload: CreateExpenseDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.treasuryService.createExpense(payload, req.authContext!);
  }
}
