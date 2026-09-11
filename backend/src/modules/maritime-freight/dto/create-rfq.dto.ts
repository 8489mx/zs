import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, Min } from 'class-validator';

export class CreateMaritimeRfqDto {
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

  @IsString()
  @IsOptional()
  cargoReadyDate?: string;

  @IsInt()
  @IsOptional()
  targetFreeDays?: number;

  @IsString()
  @IsOptional()
  paymentTerm?: 'prepaid' | 'collect';

  @IsArray()
  @IsOptional()
  targetLineIds?: number[];

  @IsOptional()
  inquiryId?: string;

  @IsOptional()
  customerId?: number;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
