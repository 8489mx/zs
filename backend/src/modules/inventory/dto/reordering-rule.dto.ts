import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateReorderingRuleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  warehouseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minQty!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxQty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qtyMultiple?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  preferredSupplierId?: number;

  @IsOptional()
  @IsEnum(['auto_draft_po', 'manual_review'])
  actionMode?: 'auto_draft_po' | 'manual_review';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReorderingRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  warehouseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qtyMultiple?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  preferredSupplierId?: number;

  @IsOptional()
  @IsEnum(['auto_draft_po', 'manual_review'])
  actionMode?: 'auto_draft_po' | 'manual_review';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RunReorderingEvaluationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warehouseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsBoolean()
  autoCreateOrders?: boolean;
}
