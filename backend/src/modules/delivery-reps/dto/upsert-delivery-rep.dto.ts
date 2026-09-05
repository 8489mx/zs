import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class UpsertDeliveryRepDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  nationalId?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsString()
  @IsOptional()
  pinCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
