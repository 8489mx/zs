import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class PurchaseItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost!: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unitName?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  unitMultiplier?: number;
}

export class UpsertPurchaseDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  supplierId!: number;

  @IsOptional()
  @IsIn(['cash', 'credit'])
  paymentType?: 'cash' | 'credit';

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  pricesIncludeTax?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  branchId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  locationId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
