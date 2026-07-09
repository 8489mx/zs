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

export class ResetOwnerPasswordDto {
  @IsOptional()
  @IsString()
  newPassword?: string;
}

export class ActivateTenantDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planId?: number;

  @IsOptional()
  @Type(() => Number)
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  durationMonths?: number;
}

export class RenewTenantDto {
  @Type(() => Number)
  @IsInt()
  planId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  durationMonths!: number;

  @IsOptional()
  @Type(() => Number)
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class CreateSaasPlanDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @Type(() => Number)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  billingPeriodMonths!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxUsers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxBranches?: number;
}

export class RecordPaymentDto {
  @Type(() => Number)
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  method!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  date?: string;
}

