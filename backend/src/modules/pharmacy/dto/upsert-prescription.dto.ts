import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertPrescriptionDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  prescriptionNo?: string;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  doctorSpecialty?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insuranceCardNo?: string;

  @IsOptional()
  @IsString()
  approvalCode?: string;

  @IsOptional()
  @IsNumber()
  patientCopayPercent?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  patientAmount?: number;

  @IsOptional()
  @IsNumber()
  insuranceAmount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  items?: Array<{
    drugName: string;
    dosage?: string;
    duration?: string;
    frequency?: string;
    notes?: string;
    price?: number;
  }>;

  @IsOptional()
  @IsString()
  dispensedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
