import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class HeldSaleItemDto {
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
  price!: number;

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

  @IsOptional()
  @IsIn(['retail', 'wholesale'])
  priceType?: 'retail' | 'wholesale';
}

export class HeldSaleDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsIn(['cash', 'credit'])
  paymentType?: 'cash' | 'credit';

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  cardAmount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  managerPin?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['retail', 'wholesale'])
  priceType?: 'retail' | 'wholesale';

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
  @Type(() => HeldSaleItemDto)
  items!: HeldSaleItemDto[];
}
