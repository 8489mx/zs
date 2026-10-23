import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OpenCashierShiftDto {
  @IsOptional() @Transform(({ value }) => (value == null || value === '' ? 0 : Number(value))) @IsNumber() @Min(0) openingCash?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @Transform(({ value }) => (value == null || value === '' ? undefined : Number(value))) @IsNumber() branchId?: number;
  @IsOptional() @Transform(({ value }) => (value == null || value === '' ? undefined : Number(value))) @IsNumber() locationId?: number;
  @IsOptional() @IsString() @MaxLength(100) password?: string;
  @IsOptional() @IsString() @MaxLength(100) managerPin?: string;
}

