import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateMaritimeQuotationDto {
  @IsString()
  @IsOptional()
  inquiryId?: string;

  @IsString()
  @IsOptional()
  rfqId?: string;

  @IsString()
  @IsOptional()
  bidId?: string;

  @IsOptional()
  customerId?: number | null;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  transportMode?: 'sea' | 'air' | 'road' | 'multimodal';

  @IsString()
  @IsOptional()
  airCargoType?: string;

  @IsNumber()
  @IsOptional()
  grossWeightKg?: number;

  @IsNumber()
  @IsOptional()
  volumetricWeightKg?: number;

  @IsNumber()
  @IsOptional()
  chargeableWeightKg?: number;

  @IsNumber()
  @IsOptional()
  totalCbm?: number;

  @IsInt()
  @IsOptional()
  packageCount?: number;

  @IsString()
  @IsOptional()
  flightNumber?: string;

  @IsString()
  @IsOptional()
  flightDate?: string;

  @IsString()
  @IsOptional()
  mawbNumber?: string;

  @IsString()
  @IsOptional()
  hawbNumber?: string;

  @IsString()
  @IsOptional()
  paymentTerm?: 'prepaid' | 'collect';

  @IsNumber()
  @Min(0)
  baseCost!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  marginType?: 'fixed' | 'percentage';

  @IsNumber()
  @Min(0)
  marginValue!: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
