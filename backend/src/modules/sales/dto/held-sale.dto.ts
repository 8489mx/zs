import { Transform, Type } from 'class-transformer';
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

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  modifiers?: any;
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

  @IsOptional()
  @IsIn(['cash', 'card', 'wallet', 'instapay', 'mixed', 'credit'])
  paymentChannel?: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';

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
  transferAmount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

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
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsIn(['retail', 'wholesale'])
  priceType?: 'retail' | 'wholesale';

  @Transform(({ value }: { value: unknown }) => (value && Number(value) > 0 ? Number(value) : undefined))
  @IsOptional()
  @IsNumber()
  @Min(1)
  branchId?: number;

  @Transform(({ value }: { value: unknown }) => (value && Number(value) > 0 ? Number(value) : undefined))
  @IsOptional()
  @IsNumber()
  @Min(1)
  locationId?: number;

  @Transform(({ value }: { value: unknown }) => (value && Number(value) > 0 ? Number(value) : undefined))
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryRepId?: number;

  @IsOptional()
  @IsString()
  deliveryStatus?: string;

  @Transform(({ value }: { value: unknown }) => (value ? String(value) : undefined))
  @IsOptional()
  @IsIn(['cod', 'prepaid_by_rep', 'prepaid_online'])
  collectionStatus?: 'cod' | 'prepaid_by_rep' | 'prepaid_online';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HeldSaleItemDto)
  items!: HeldSaleItemDto[];
}
