import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertCustomerDto {
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
  @IsIn(['cash', 'vip'])
  type?: 'cash' | 'vip';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storeCreditBalance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxNumber?: string;
}
