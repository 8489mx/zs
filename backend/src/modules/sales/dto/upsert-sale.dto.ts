import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class SalePaymentDto {
  @IsIn(['cash', 'card'])
  paymentChannel!: 'cash' | 'card';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

class SaleItemDto {
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

export class UpsertSaleDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsIn(['cash', 'credit'])
  paymentType?: 'cash' | 'credit';

  @IsOptional()
  @IsIn(['cash', 'card', 'mixed', 'credit'])
  paymentChannel?: 'cash' | 'card' | 'mixed' | 'credit';

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

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  storeCreditUsed?: number;

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
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  @IsOptional()
  payments?: SalePaymentDto[];
}

export type NormalizedSalePayload = {
  customerId: number | null;
  paymentType: 'cash' | 'credit';
  paymentChannel: 'cash' | 'card' | 'mixed' | 'credit';
  discount: number;
  taxRate: number;
  pricesIncludeTax: boolean;
  storeCreditUsed: number;
  note: string;
  branchId: number | null;
  locationId: number | null;
  items: Array<{ productId: number; qty: number; price: number; unitName: string; unitMultiplier: number; priceType: 'retail' | 'wholesale' }>;
  payments: Array<{ paymentChannel: 'cash' | 'card'; amount: number }>;
};
