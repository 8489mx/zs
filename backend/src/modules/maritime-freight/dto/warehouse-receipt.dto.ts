import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateWarehouseReceiptDto {
  @IsNotEmpty()
  jobId!: string | number;

  @IsOptional()
  locationId?: string | number | null;

  @IsString()
  @IsOptional()
  receivedDate?: string;

  @IsInt()
  @Min(1)
  packageCount!: number;

  @IsNumber()
  @Min(0)
  grossWeightKg!: number;

  @IsNumber()
  @Min(0)
  cbm!: number;

  @IsString()
  @IsOptional()
  bayRackBin?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReleaseWarehouseReceiptDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
