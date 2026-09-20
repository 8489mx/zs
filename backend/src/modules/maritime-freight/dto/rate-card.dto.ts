import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, Min, IsIn } from 'class-validator';

export class CreateRateCardDto {
  @IsOptional()
  shippingLineId?: string | number | null;

  @IsString()
  @IsOptional()
  carrierName?: string;

  @IsString()
  @IsNotEmpty()
  polCode!: string;

  @IsString()
  @IsOptional()
  polName?: string;

  @IsString()
  @IsNotEmpty()
  podCode!: string;

  @IsString()
  @IsOptional()
  podName?: string;

  @IsString()
  @IsOptional()
  cargoMode?: string;

  @IsString()
  @IsOptional()
  transportMode?: 'sea' | 'air' | 'road' | 'multimodal';

  @IsString()
  @IsOptional()
  rateBasis?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minCharge?: number;

  @IsString()
  @IsOptional()
  containerType?: string;

  @IsNumber()
  @Min(0)
  oceanFreight!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  thcOrigin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  thcDestination?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bafCharges?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  otherCharges?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  transitTimeDays?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  freeDays?: number;

  @IsString()
  @IsOptional()
  validFrom?: string;

  @IsString()
  @IsNotEmpty()
  validUntil!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateRateCardStatusDto {
  @IsString()
  @IsIn(['active', 'expired', 'draft'])
  status!: 'active' | 'expired' | 'draft';
}

export class RateCardLookupQueryDto {
  @IsString()
  @IsNotEmpty()
  polCode!: string;

  @IsString()
  @IsNotEmpty()
  podCode!: string;

  @IsString()
  @IsOptional()
  containerType?: string;
}
