import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BranchPayloadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  defaultStockLocationId?: string | number | null;

  @IsOptional()
  @IsString()
  salesStockMode?: 'single_location' | 'all_operational_locations';

  @IsOptional()
  allowExternalSalesStock?: boolean;
}
