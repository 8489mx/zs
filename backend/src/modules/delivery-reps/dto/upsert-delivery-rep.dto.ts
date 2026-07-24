import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class UpsertDeliveryRepDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
