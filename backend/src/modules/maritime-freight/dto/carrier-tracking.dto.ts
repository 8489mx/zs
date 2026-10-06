import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CarrierTrackingEventDto {
  @IsString()
  @IsNotEmpty()
  carrierCode!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;

  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsString()
  @IsOptional()
  eventLocation?: string;

  @IsString()
  @IsOptional()
  eventTime?: string;

  @IsOptional()
  rawPayload?: any;
}

export class CarrierTrackingSyncDto {
  @IsString()
  @IsNotEmpty()
  carrierCode!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
