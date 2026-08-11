import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class JournalEntriesQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['draft', 'posted', 'cancelled'])
  status?: 'draft' | 'posted' | 'cancelled';

  @IsOptional()
  @IsString()
  sourceType?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class FinancialSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  branch_id?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  location_id?: number;
}

export class ReceivablesPayablesQueryDto {
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  branch_id?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  location_id?: number;

  @IsOptional()
  @IsString()
  show_zero?: string;
}

export class CashMovementQueryDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  branch_id?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  location_id?: number;
}

export class InventoryValueQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  category_id?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  location_id?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  supplier_id?: number;

  @IsOptional()
  @IsString()
  low_stock_only?: string;

  @IsOptional()
  @IsString()
  zero_stock_only?: string;
}

export class OpeningBalancesPreviewQueryDto {
  @IsOptional()
  @IsDateString()
  system_start_date?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  cash_opening?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  bank_opening?: number;
}

export class PostOpeningBalancesDto {
  @IsDateString()
  system_start_date!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  cash_opening?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  bank_opening?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  nameAr!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsIn(['asset', 'liability', 'equity', 'revenue', 'expense', 'contra_asset', 'contra_revenue'])
  accountType!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsIn(['debit', 'credit'])
  normalBalance!: string;

  @IsOptional()
  isActive?: boolean;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsIn(['asset', 'liability', 'equity', 'revenue', 'expense', 'contra_asset', 'contra_revenue'])
  accountType?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsIn(['debit', 'credit'])
  normalBalance?: string;

  @IsOptional()
  isActive?: boolean;
}

export class GenerateCodeQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  parentId!: number;
}

export class UpdateAccountingSettingsDto {
  @IsOptional() @IsNumber() cashAccountId?: number;
  @IsOptional() @IsNumber() bankAccountId?: number;
  @IsOptional() @IsNumber() customerReceivableAccountId?: number;
  @IsOptional() @IsNumber() supplierPayableAccountId?: number;
  @IsOptional() @IsNumber() inventoryAccountId?: number;
  @IsOptional() @IsNumber() salesRevenueAccountId?: number;
  @IsOptional() @IsNumber() salesDiscountAccountId?: number;
  @IsOptional() @IsNumber() cogsAccountId?: number;
  @IsOptional() @IsNumber() purchaseAccountId?: number;
  @IsOptional() @IsNumber() expensesAccountId?: number;
  @IsOptional() @IsNumber() salesTaxAccountId?: number;
  @IsOptional() @IsNumber() purchaseTaxAccountId?: number;
}

