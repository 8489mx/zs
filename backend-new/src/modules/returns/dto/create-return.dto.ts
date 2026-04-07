import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ReturnItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId!: number;

  @IsOptional()
  @IsString()
  productName?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class CreateReturnDto {
  @IsIn(['sale', 'purchase'])
  type!: 'sale' | 'purchase';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  invoiceId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  @IsOptional()
  @IsIn(['refund', 'store_credit'])
  settlementMode?: 'refund' | 'store_credit';

  @IsOptional()
  @IsIn(['cash', 'card'])
  refundMethod?: 'cash' | 'card';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  managerPin?: string;
}
