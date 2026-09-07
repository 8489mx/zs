import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PurchaseLandedCostItemDto {
  @IsIn(['freight', 'customs', 'handling', 'insurance', 'other'])
  costType!: 'freight' | 'customs' | 'handling' | 'insurance' | 'other';

  @IsString()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  vendorId?: number | null;
}

export class ApplyPurchaseLandedCostsDto {
  @IsIn(['value', 'qty', 'equal'])
  allocationMethod!: 'value' | 'qty' | 'equal';

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => PurchaseLandedCostItemDto)
  costs!: PurchaseLandedCostItemDto[];
}
