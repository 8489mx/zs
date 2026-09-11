import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateMaritimeJobDto {
  @IsString()
  @IsOptional()
  inquiryId?: string;

  @IsString()
  @IsOptional()
  quotationId?: string;

  @IsString()
  @IsOptional()
  rfqId?: string;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsOptional()
  customerId?: number | null;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsOptional()
  direction?: 'import' | 'export' | 'cross_trade';

  @IsString()
  @IsOptional()
  paymentTerm?: 'prepaid' | 'collect';

  @IsOptional()
  shippingLineId?: string | number | null;

  @IsString()
  @IsNotEmpty()
  shippingLineName!: string;

  @IsString()
  @IsOptional()
  bookingNumber?: string;

  @IsString()
  @IsOptional()
  vesselName?: string;

  @IsString()
  @IsOptional()
  voyageNumber?: string;

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
  etd?: string;

  @IsString()
  @IsOptional()
  eta?: string;

  @IsString()
  @IsOptional()
  portCutOff?: string;

  @IsString()
  @IsOptional()
  blType?: 'original' | 'telex_release' | 'sea_waybill';

  @IsString()
  @IsOptional()
  mblNumber?: string;

  @IsString()
  @IsOptional()
  hblNumber?: string;

  @IsString()
  @IsOptional()
  shipperDetails?: string;

  @IsString()
  @IsOptional()
  consigneeDetails?: string;

  @IsString()
  @IsOptional()
  notifyParty?: string;

  @IsArray()
  @IsOptional()
  containers?: Array<{
    containerNumber: string;
    containerType: string;
    sealNumber?: string;
    grossWeightKg?: number;
    cbm?: number;
    freeDays?: number;
    depositAmount?: number;
    depositCurrency?: string;
  }>;

  @IsString()
  @IsOptional()
  notes?: string;
}
