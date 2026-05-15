import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewCashierShiftDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

