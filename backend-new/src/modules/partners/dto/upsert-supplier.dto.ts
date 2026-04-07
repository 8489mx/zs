import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertSupplierDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @Type(() => Number)
  @IsNumber()
  balance!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
