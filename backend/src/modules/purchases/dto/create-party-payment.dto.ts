import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSupplierPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  supplierId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['cash', 'bank', 'card', 'wallet', 'instapay'])
  paymentChannel?: 'cash' | 'bank' | 'card' | 'wallet' | 'instapay';

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
}

export class CreateCustomerPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  customerId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['cash', 'bank', 'card', 'wallet', 'instapay'])
  paymentChannel?: 'cash' | 'bank' | 'card' | 'wallet' | 'instapay';

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

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  jobId?: number;
}
