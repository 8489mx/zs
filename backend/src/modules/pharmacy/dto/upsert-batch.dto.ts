import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBatchDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  drugId?: number;

  @IsString()
  batchNumber!: string;

  @IsString()
  expiryDate!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
