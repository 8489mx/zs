import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListSaasTenantsQueryDto {
  @IsOptional()
  @IsIn(['trial', 'active', 'expired', 'suspended'])
  status?: 'trial' | 'active' | 'expired' | 'suspended';

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateTrialTenantDto {
  @IsString()
  slug!: string;

  @IsString()
  businessName!: string;

  @IsString()
  ownerName!: string;

  @IsString()
  ownerPhone!: string;

  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsString()
  username!: string;

  @IsOptional()
  @IsString()
  password?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExtendTrialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}

export class TenantStatusActionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
