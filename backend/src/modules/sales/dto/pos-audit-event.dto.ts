import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PosAuditEventDto {
  @IsIn(['cart_remove', 'draft_cancel'])
  eventType!: 'cart_remove' | 'draft_cancel';

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  productId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  productName?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  qty?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  cartItemsCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
