import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateTreasuryTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromAccountId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  toAccountId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  /** Stable client-generated key; retries return the original transfer. */
  @IsString()
  @MinLength(8)
  requestKey!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
