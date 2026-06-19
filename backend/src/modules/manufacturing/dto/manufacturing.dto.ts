import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBomLineDto {
  @IsNumber()
  componentProductId!: number;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsString()
  unitName!: string;

  @IsNumber()
  @Min(0.000001)
  unitMultiplier!: number;

  @IsNumber()
  @Min(0)
  expectedCost!: number;
}

export class CreateBomDto {
  @IsNumber()
  productId!: number;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBomLineDto)
  lines!: CreateBomLineDto[];
}

export class CreateWorkOrderDto {
  @IsNumber()
  bomId!: number;

  @IsNumber()
  @Min(0.001)
  quantityToProduce!: number;

  @IsOptional()
  @IsNumber()
  sourceLocationId?: number;

  @IsOptional()
  @IsNumber()
  destinationLocationId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CompleteWorkOrderDto {
  @IsOptional()
  @IsNumber()
  sourceLocationId?: number;

  @IsOptional()
  @IsNumber()
  destinationLocationId?: number;
}
