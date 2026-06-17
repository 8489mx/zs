import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertAddressDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  addressLine?: string;
}
