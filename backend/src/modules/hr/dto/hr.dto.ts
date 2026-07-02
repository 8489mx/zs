import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertHrMasterDataDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  jobTitleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationId?: number;

  @IsOptional()
  isActive?: boolean;
}

export class UpsertEmployeeDto {
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  employeeNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  nationalId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsIn(['active', 'inactive', 'deactivated', 'terminated'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  jobTitleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  positionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsIn(['monthly', 'hourly'])
  compensationType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedDailyHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  scheduledCheckInTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  scheduledCheckOutTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsIn(['review_only', 'disabled', 'auto_approved'])
  overtimePolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertEmployeeContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactType?: string;

  @IsString()
  @MaxLength(180)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpsertEmployeeDocumentDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  fileUrl?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpsertEmploymentContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  contractNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  contractType?: string;

  @IsOptional()
  @IsIn(['draft', 'active', 'ended', 'cancelled'])
  status?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary!: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertCompensationPackageDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  packageName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allowanceAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductionAmount?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertEmployeeLoanDto {
  @Type(() => Number)
  @IsNumber()
  employeeId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  loanNo?: string;

  @IsOptional()
  @IsIn(['advance', 'loan'])
  loanType?: string;

  @IsOptional()
  @IsIn(['deduct_next_salary', 'monthly_salary_installment', 'manual_cash'])
  repaymentMode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  principalAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  installmentCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monthlyInstallmentAmount?: number;

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsDateString()
  firstDueDate?: string;

  @IsOptional()
  @IsDateString()
  salaryDueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class LoanRepaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsIn(['manual_cash', 'salary_deduction'])
  repaymentMethod?: string;
}

export class CreatePayrollRunDto {
  @IsString()
  @MaxLength(7)
  periodMonth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertPayrollItemDto {
  @IsOptional()
  @IsIn(['draft', 'excluded'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreatePayrollAdjustmentDto {
  @IsIn(['allowance', 'deduction'])
  adjustmentType!: string;

  @IsString()
  @MaxLength(160)
  label!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertAttendanceRecordDto {
  @Type(() => Number)
  @IsNumber()
  employeeId!: number;

  @IsDateString()
  workDate!: string;

  @IsOptional()
  @IsIn(['present', 'absent', 'late', 'half_day', 'leave', 'excused', 'early_leave'])
  status?: string;

  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @IsOptional()
  @IsIn(['manual', 'import'])
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class DecideAttendanceExceptionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class BulkSaveAttendanceDto {
  @IsDateString()
  workDate!: string;

  @IsArray()
  rows!: UpsertAttendanceRecordDto[];
}

export class UpsertLeaveTypeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  isPaid?: boolean;

  @IsOptional()
  isActive?: boolean;
}

export class CreateLeaveRequestDto {
  @Type(() => Number)
  @IsNumber()
  employeeId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leaveTypeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  leaveType?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  daysCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class DecideLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  decisionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertEmployeeAssetDto {
  @Type(() => Number)
  @IsNumber()
  employeeId!: number;

  @IsString()
  @MaxLength(80)
  assetType!: string;

  @IsString()
  @MaxLength(160)
  assetName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assetCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNo?: string;

  @IsOptional()
  @IsDateString()
  assignedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class EmployeeAssetActionDto {
  @IsOptional()
  @IsDateString()
  returnedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  returnNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deductionAmount?: number;
}

export class CreateEmployeeAdjustmentDto {
  @IsIn(['allowance', 'deduction'])
  adjustmentType!: string;

  @IsIn(['money', 'days', 'hours'])
  amountType!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
