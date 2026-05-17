import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSupplierPaymentScheduleDto {
  @IsIn(['count', 'amount'])
  mode!: 'count' | 'amount';

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  installmentCount?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  installmentAmount?: number;

  @IsString()
  firstDueDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalDays!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  roundingStep?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PaySupplierScheduleInstallmentDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

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
}
