import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseCashierShiftDto {
  @Transform(({ value }) => Number(value)) @IsNumber() countedCash!: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsString() @MaxLength(100) managerPin!: string;
}
