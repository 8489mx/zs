import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStorefrontSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  announcement?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannerUrls?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsString()
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  bannerFit?: 'contain' | 'cover';

  @IsOptional()
  @IsString()
  bannerPosition?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannerPositions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  bannerIntervalSeconds?: number;

  @IsOptional()
  @IsString()
  customDomain?: string;
}
