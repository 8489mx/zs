import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertClinicalServiceDto {
  @IsString()
  serviceType!: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  metricValue1?: string;

  @IsOptional()
  @IsString()
  metricValue2?: string;

  @IsOptional()
  @IsString()
  pharmacistNotes?: string;

  @IsOptional()
  @IsNumber()
  fee?: number;
}
