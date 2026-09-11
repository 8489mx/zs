import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class CreateMaritimeInquiryDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsOptional()
  customerId?: number;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsNotEmpty()
  polCode!: string;

  @IsString()
  @IsNotEmpty()
  polName!: string;

  @IsString()
  @IsNotEmpty()
  podCode!: string;

  @IsString()
  @IsNotEmpty()
  podName!: string;

  @IsString()
  @IsOptional()
  direction?: 'import' | 'export' | 'cross_trade';

  @IsString()
  @IsOptional()
  incoterm?: string;

  @IsString()
  @IsOptional()
  cargoMode?: string;

  @IsString()
  @IsOptional()
  containerType?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  containerCount?: number;

  @IsString()
  @IsOptional()
  commodityDescription?: string;

  @IsString()
  @IsOptional()
  cargoNature?: string;

  @IsNumber()
  @IsOptional()
  grossWeightKg?: number;

  @IsNumber()
  @IsOptional()
  cbm?: number;

  @IsString()
  @IsOptional()
  cargoReadyDate?: string;

  @IsString()
  @IsOptional()
  targetDeliveryDate?: string;

  @IsInt()
  @IsOptional()
  targetFreeDays?: number;

  @IsString()
  @IsOptional()
  paymentTerm?: 'prepaid' | 'collect';

  @IsString()
  @IsOptional()
  notes?: string;
}
