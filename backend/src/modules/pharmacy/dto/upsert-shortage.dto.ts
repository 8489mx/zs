import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertShortageDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  activeIngredient?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  suggestedDistributor?: string;

  @IsOptional()
  @IsNumber()
  requestedQuantity?: number;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
