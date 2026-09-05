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
  address?: string;

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

  @IsOptional()
  @IsBoolean()
  smartDealsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  freeShippingEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingMinOrder?: number;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  onlinePaymentEnabled?: boolean;

  @IsOptional()
  @IsString()
  onlinePaymentProvider?: string;

  @IsOptional()
  @IsString()
  paymobApiKey?: string;

  @IsOptional()
  @IsString()
  paymobIntegrationId?: string;

  @IsOptional()
  @IsString()
  paymobIframeId?: string;

  @IsOptional()
  @IsString()
  paymobHmacSecret?: string;

  @IsOptional()
  @IsBoolean()
  paymobTestMode?: boolean;

  @IsOptional()
  @IsString()
  xpayApiKey?: string;

  @IsOptional()
  @IsString()
  xpayCommunityId?: string;

  @IsOptional()
  @IsBoolean()
  xpayTestMode?: boolean;

  // Tap Payments (GCC)
  @IsOptional()
  @IsString()
  tapSecretKey?: string;

  @IsOptional()
  @IsString()
  tapPublishableKey?: string;

  @IsOptional()
  @IsBoolean()
  tapTestMode?: boolean;

  // Stripe (International)
  @IsOptional()
  @IsString()
  stripeSecretKey?: string;

  @IsOptional()
  @IsString()
  stripePublishableKey?: string;

  @IsOptional()
  @IsString()
  stripeWebhookSecret?: string;

  @IsOptional()
  @IsBoolean()
  stripeTestMode?: boolean;
}
