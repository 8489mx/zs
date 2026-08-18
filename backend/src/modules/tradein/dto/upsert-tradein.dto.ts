import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertTradeInDto {
  @IsNotEmpty({ message: 'اسم البائع / العميل مطلوب' })
  @IsString()
  sellerName!: string;

  @IsNotEmpty({ message: 'رقم هاتف البائع مطلوب' })
  @IsString()
  sellerPhone!: string;

  @IsNotEmpty({ message: 'الرقم القومي للبائع مطلوب للتوثيق الأمني' })
  @IsString()
  sellerNationalId!: string;

  @IsOptional()
  @IsString()
  deviceBrand?: string;

  @IsNotEmpty({ message: 'موديل الجهاز مطلوب' })
  @IsString()
  deviceModel!: string;

  @IsNotEmpty({ message: 'رقم السيريال / IMEI مطلوب' })
  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsString()
  imei2?: string;

  @IsOptional()
  @IsString()
  deviceConditionNotes?: string;

  @IsNotEmpty({ message: 'سعر الشراء المتفق عليه مطلوب' })
  @IsNumber()
  @Min(0)
  agreedPurchasePrice!: number;

  @IsOptional()
  @IsString()
  transactionType?: 'cash_purchase' | 'exchange_trade_in';

  @IsOptional()
  @IsNumber()
  createdProductId?: number;

  @IsOptional()
  @IsNumber()
  saleId?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  signatureData?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
