import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertDrugDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsString()
  tradeName!: string;

  @IsOptional()
  @IsString()
  tradeNameAr?: string;

  @IsString()
  activeIngredient!: string;

  @IsOptional()
  @IsString()
  activeIngredientAr?: string;

  @IsString()
  dosageForm!: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  drugClass?: string;

  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;

  @IsOptional()
  @IsString()
  controlledLevel?: string;

  @IsOptional()
  @IsNumber()
  unitsPerBox?: number;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @IsNumber()
  stripPrice?: number;

  @IsOptional()
  @IsNumber()
  boxPrice?: number;

  @IsOptional()
  @IsString()
  pregnancySafety?: string;

  @IsOptional()
  @IsString()
  storageCondition?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  indications?: string;

  @IsOptional()
  @IsString()
  sideEffects?: string;
}
