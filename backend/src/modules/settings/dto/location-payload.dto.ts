import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class LocationPayloadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value == null || value === 0 || value === '0') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed < 1 ? undefined : parsed;
  })
  @IsInt()
  @Min(1)
  branchId?: number;

  @IsOptional()
  @IsString()
  locationType?: string;
}
