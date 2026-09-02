import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestRenewalDto {
  @IsNumber()
  planId!: number;

  @IsOptional()
  @IsNumber()
  billingPeriodMonths?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InitiateOnlinePaymentDto {
  @IsNumber()
  planId!: number;

  @IsOptional()
  @IsNumber()
  billingPeriodMonths?: number;

  @IsOptional()
  @IsString()
  gateway?: 'xpay' | 'paymob' | 'stripe';

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}
