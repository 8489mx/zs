import { IsString, MinLength, MaxLength } from 'class-validator';

export class InitializeSetupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  storeName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  branchName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  locationName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  adminUsername!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminDisplayName!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(256)
  adminPassword!: string;
}
