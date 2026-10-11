import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateKitchenPrinterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  stationCode!: string; // 'kitchen' | 'bar' | 'grill' | 'fryer' | 'cold' | 'dessert' | 'expo'

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsNumber()
  @IsOptional()
  port?: number;

  @IsString()
  @IsOptional()
  paperWidth?: string; // '80mm' | '58mm'

  @IsNumber()
  @IsOptional()
  branchId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  categoryIds?: number[];
}

export class UpdateKitchenPrinterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  stationCode?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsNumber()
  @IsOptional()
  port?: number;

  @IsString()
  @IsOptional()
  paperWidth?: string;

  @IsNumber()
  @IsOptional()
  branchId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  categoryIds?: number[];
}
