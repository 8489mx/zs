import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CashMovementDto {
  @IsOptional() @IsIn(['cash_in', 'cash_out']) type?: 'cash_in' | 'cash_out';
  @Transform(({ value }) => Number(value)) @IsNumber() amount!: number;
  @IsString() @MaxLength(500) note!: string;
  @IsOptional() @IsString() @MaxLength(100) managerPin?: string;
}
