import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateMaritimeContainerDto {
  @IsString()
  @IsOptional()
  sealNumber?: string;

  @IsString()
  @IsOptional()
  gatedInAt?: string;

  @IsString()
  @IsOptional()
  vesselLoadedAt?: string;

  @IsString()
  @IsOptional()
  dischargedAt?: string;

  @IsString()
  @IsOptional()
  gatedOutAt?: string;

  @IsString()
  @IsOptional()
  emptyReturnedAt?: string;

  @IsNumber()
  @IsOptional()
  freeDays?: number;

  @IsString()
  @IsOptional()
  returnDeadline?: string;

  @IsNumber()
  @IsOptional()
  demurrageRatePerDay?: number;

  @IsNumber()
  @IsOptional()
  depositAmount?: number;

  @IsString()
  @IsOptional()
  depositCurrency?: string;

  @IsString()
  @IsOptional()
  depositStatus?: 'not_required' | 'held_by_line' | 'pending_return_proof' | 'refunded_to_treasury';

  @IsString()
  @IsOptional()
  emptyReturnProofUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
