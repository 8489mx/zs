import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomsDeclarationItemDto {
  @IsString()
  @IsNotEmpty()
  hsCode!: string;

  @IsString()
  @IsOptional()
  commodityDescription?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  customsValue!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  dutyRatePercent!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateCustomsDeclarationDto {
  @IsString()
  @IsOptional()
  declarationNumber?: string;

  @IsString()
  @IsIn(['import', 'export'])
  @IsOptional()
  declarationType?: 'import' | 'export';

  @IsString()
  @IsOptional()
  customsAuthority?: string;

  @IsString()
  @IsOptional()
  brokerName?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomsDeclarationItemDto)
  @IsOptional()
  items?: CreateCustomsDeclarationItemDto[];
}

export class UpdateCustomsDeclarationStatusDto {
  @IsString()
  @IsIn(['pending', 'submitted', 'cleared', 'held', 'rejected'])
  status!: 'pending' | 'submitted' | 'cleared' | 'held' | 'rejected';

  @IsString()
  @IsOptional()
  declarationNumber?: string;
}
