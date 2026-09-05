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

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '').trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'يرجى إدخال رقم الهاتف' })
  @Matches(/^01[0125]\d{8}$/, { message: 'رقم المحمول يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015' })
  customerPhone!: string;

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
}
