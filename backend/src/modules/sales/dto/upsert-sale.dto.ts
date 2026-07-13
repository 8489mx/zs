import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class SalePaymentDto {
  @IsIn(['cash', 'card', 'wallet', 'instapay'])
  paymentChannel!: 'cash' | 'card' | 'wallet' | 'instapay';

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

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  modifiers?: any;
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
  @IsIn(['cash', 'card', 'wallet', 'instapay', 'mixed', 'credit'])
  paymentChannel?: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';

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

  @IsOptional()
  @IsString()
  managerPin?: string;

  @IsOptional()
  @IsString()
  editReason?: string;

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

  @IsOptional()
  @IsIn(['pos', 'dashboard'])
  source?: 'pos' | 'dashboard';

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

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  tenderedAmount?: number;
}

export type NormalizedSalePayload = {
  customerId: number | null;
  paymentType: 'cash' | 'credit';
  paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';
  discount: number;
  taxRate: number;
  pricesIncludeTax: boolean;
  storeCreditUsed: number;
  note: string;
  managerPin: string;
  branchId: number | null;
  locationId: number | null;
  source: 'pos' | 'dashboard';
  items: Array<{ productId: number; qty: number; price: number; unitName: string; unitMultiplier: number; priceType: 'retail' | 'wholesale'; notes: string; modifiers: any }>;
  payments: Array<{ paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay'; amount: number }>;
  tenderedAmount: number;
};
