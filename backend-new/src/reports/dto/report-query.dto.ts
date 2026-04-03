import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReportRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  branchId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  locationId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  filter?: string;
}
