import { Transform, Type } from 'class-transformer';
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

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  offerDiscount?: number;

  @IsOptional()
  @IsString()
  offerName?: string;

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

  @IsOptional()
  @IsArray()
  serials?: string[];
}

export class UpsertSaleDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

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
  deliveryFee?: number;

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

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyPointsRedeemed?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  managerPin?: string;

  @IsOptional()
  @IsString()
  editReason?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  orderType?: string;

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

  @IsOptional()
  @IsIn(['freelance_courier', 'store_fleet'])
  deliveryFeeMode?: 'freelance_courier' | 'store_fleet';

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
  deliveryFee: number;
  taxRate: number;
  pricesIncludeTax: boolean;
  storeCreditUsed: number;
  loyaltyPointsRedeemed: number;
  note: string;
  managerPin: string;
  branchId: number | null;
  locationId: number | null;
  source: 'pos' | 'dashboard';
  items: Array<{ productId: number; qty: number; price: number; originalPrice?: number; offerDiscount?: number; offerName?: string; unitName: string; unitMultiplier: number; priceType: 'retail' | 'wholesale'; notes: string; modifiers: any; serials?: string[] }>;
  payments: Array<{ paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay'; amount: number }>;
  tenderedAmount: number;
  tableNumber: string | null;
  orderType: string | null;
  deliveryRepId?: number;
  deliveryStatus?: string;
  collectionStatus?: 'cod' | 'prepaid_by_rep' | 'prepaid_online';
  deliveryFeeMode?: 'freelance_courier' | 'store_fleet';
};
