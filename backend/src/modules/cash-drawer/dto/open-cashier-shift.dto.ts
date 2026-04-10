import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class OpenCashierShiftDto {
  @IsOptional() @Transform(({ value }) => (value == null || value === '' ? 0 : Number(value))) @IsNumber() openingCash?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @Transform(({ value }) => (value == null || value === '' ? undefined : Number(value))) @IsNumber() branchId?: number;
  @IsOptional() @Transform(({ value }) => (value == null || value === '' ? undefined : Number(value))) @IsNumber() locationId?: number;
}
