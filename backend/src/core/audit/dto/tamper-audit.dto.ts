import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class TamperAuditQueryDto {
  @IsOptional()
  @IsString()
  tableName?: string;

  @IsOptional()
  @IsIn(['INSERT', 'UPDATE', 'DELETE'])
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';

  @IsOptional()
  @IsString()
  recordId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;
}
