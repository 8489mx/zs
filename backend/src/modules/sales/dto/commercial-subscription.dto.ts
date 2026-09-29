import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionLineItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class CreateCommercialSubscriptionDto {
  @IsNumber()
  @IsNotEmpty()
  customerId!: number;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsString()
  @IsIn(['monthly', 'quarterly', 'semi_annual', 'annual'])
  billingPeriod!: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionLineItemDto)
  lines!: SubscriptionLineItemDto[];
}

export class UpdateSubscriptionStatusDto {
  @IsString()
  @IsIn(['draft', 'active', 'paused', 'canceled'])
  status!: 'draft' | 'active' | 'paused' | 'canceled';
}
