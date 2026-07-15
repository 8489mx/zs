import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class InventoryAdjustmentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  @ValidateIf((o) => o.actionType === 'adjust')
  @Min(0, { message: 'الحقل الكمية يجب أن يكون أكبر من أو يساوي 0.' })
  @ValidateIf((o) => o.actionType !== 'adjust')
  @Min(0.001, { message: 'الحقل الكمية يجب أن يكون أكبر من أو يساوي 0.001.' })
  qty!: number;

  @IsIn(['add', 'deduct', 'adjust'])
  actionType!: 'add' | 'deduct' | 'adjust';

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationId?: number;
}
