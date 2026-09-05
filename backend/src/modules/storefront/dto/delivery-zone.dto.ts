import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateDeliveryZoneDto {
  @IsString()
  @MinLength(2, { message: 'اسم المنطقة يجب ألا يقل عن حرفين' })
  name!: string;

  @IsNumber()
  @Min(0, { message: 'رسوم التوصيل يجب أن تكون 0 أو أكثر' })
  deliveryFee!: number;

  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'اسم المنطقة يجب ألا يقل عن حرفين' })
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'رسوم التوصيل يجب أن تكون 0 أو أكثر' })
  deliveryFee?: number;

  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
