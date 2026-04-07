import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDamagedStockDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  branchId?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  locationId!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  managerPin?: string;
}
