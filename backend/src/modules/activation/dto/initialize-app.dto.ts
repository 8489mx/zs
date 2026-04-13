import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class InitializeAppDto {
  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsString()
  @IsNotEmpty()
  branchName!: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsString()
  @IsNotEmpty()
  locationName!: string;

  @IsOptional()
  @IsString()
  locationCode?: string;

  @IsString()
  @IsNotEmpty()
  adminDisplayName!: string;

  @IsString()
  @IsNotEmpty()
  adminUsername!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}
