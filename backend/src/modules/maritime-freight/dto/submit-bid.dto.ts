import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class SubmitMaritimeBidDto {
  @IsString()
  @IsNotEmpty()
  rfqId!: string;

  @IsOptional()
  shippingLineId?: string | number | null;

  @IsString()
  @IsNotEmpty()
  shippingLineName!: string;

  @IsNumber()
  @Min(0)
  oceanFreight!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  thcOrigin?: number;

  @IsNumber()
  @IsOptional()
  thcDestination?: number;

  @IsNumber()
  @IsOptional()
  bafCharges?: number;

  @IsNumber()
  @IsOptional()
  otherCharges?: number;

  @IsInt()
  @IsOptional()
  transitTimeDays?: number;

  @IsInt()
  @IsOptional()
  freeDays?: number;

  @IsString()
  @IsOptional()
  validityDate?: string;

  @IsString()
  @IsOptional()
  submissionChannel?: 'email_auto' | 'carrier_portal' | 'manual';

  @IsOptional()
  rawBidData?: any;

  @IsString()
  @IsOptional()
  notes?: string;
}
