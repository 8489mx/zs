import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches, MinLength, ValidateNested } from 'class-validator';

export class OnlineOrderItemDto {
  @IsNumber()
  @IsPositive()
  productId!: number;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOnlineOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'يرجى إدخال اسم المستلم' })
  @MinLength(3, { message: 'اسم المستلم يجب ألا يقل عن 3 أحرف' })
  customerName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[^0-9+]/g, '').trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'يرجى إدخال رقم الهاتف' })
  @Matches(/^[+]?[0-9]{7,16}$/, { message: 'يرجى إدخال رقم هاتف صحيح (بين 7 إلى 16 رقماً)' })
  customerPhone!: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OnlineOrderItemDto)
  items!: OnlineOrderItemDto[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsNumber()
  deliveryZoneId?: number;

  @IsOptional()
  @IsString()
  deliveryZoneName?: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  fulfillmentType?: 'delivery' | 'pickup' | 'dine_in';

  @IsOptional()
  @IsNumber()
  pickupBranchId?: number;
}

