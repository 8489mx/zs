import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordAbandonedCartDto {
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsArray()
  items!: any[];

  @IsNumber()
  subtotal!: number;
}
