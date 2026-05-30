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
  supplier_id?: number;

  @IsOptional()
  @IsString()
  low_stock_only?: string;

  @IsOptional()
  @IsString()
  zero_stock_only?: string;
}

