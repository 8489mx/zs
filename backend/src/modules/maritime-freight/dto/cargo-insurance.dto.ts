import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

export class CreateCargoInsuranceDto {
  @IsNotEmpty()
  jobId!: string | number;

  @IsString()
  @IsNotEmpty()
  policyNumber!: string;

  @IsString()
  @IsNotEmpty()
  insuranceCompany!: string;

  @IsNumber()
  @Min(0)
  insuredValue!: number;

  @IsNumber()
  @Min(0)
  premiumAmount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsIn(['all_risks', 'clauses_a', 'clauses_b', 'clauses_c'])
  coverageType!: 'all_risks' | 'clauses_a' | 'clauses_b' | 'clauses_c';

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCargoInsuranceDto {
  @IsString()
  @IsOptional()
  policyNumber?: string;

  @IsString()
  @IsOptional()
  insuranceCompany?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  insuredValue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  premiumAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsIn(['all_risks', 'clauses_a', 'clauses_b', 'clauses_c'])
  @IsOptional()
  coverageType?: 'all_risks' | 'clauses_a' | 'clauses_b' | 'clauses_c';

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ClaimCargoInsuranceDto {
  @IsNumber()
  @Min(0.01)
  claimAmount!: number;

  @IsString()
  @IsNotEmpty()
  claimStatus!: string;

  @IsString()
  @IsOptional()
  claimNotes?: string;
}
