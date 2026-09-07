import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListDealsQueryDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  assignedUserId?: number;
}

export class CreateDealDto {
  @IsString()
  title!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string | null;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  assignedUserId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string | null;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  assignedUserId?: number | null;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateActivityDto {
  @IsOptional()
  @IsString()
  activityType?: string;

  @IsString()
  summary!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
