import { IsString, IsNumber, IsOptional, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShipmentDto {
  @IsString()
  containerNumber!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  billOfLading?: string;

  @IsOptional()
  @IsString()
  shippingDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exchangeRateAtArrival?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricingExchangeRate?: number;

}

export class UpdateShipmentCostsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCostUsd?: number;

  @IsOptional()
  @IsString()
  shippingAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customsCostEgp?: number;

  @IsOptional()
  @IsString()
  customsAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  internalTransportCostEgp?: number;

  @IsOptional()
  @IsString()
  transportAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchangeRateAtArrival?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricingExchangeRate?: number;

  @IsOptional()
  @IsIn(['Pending', 'In Customs', 'Arrived'])
  status?: string;

  @IsOptional()
  @IsString()
  shippedDate?: string;

  @IsOptional()
  @IsString()
  etaDate?: string;

  @IsOptional()
  @IsString()
  clearanceDate?: string;
}

export class AddShipmentItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  factoryUnitPriceUsd!: number;
}

export class UpdateShipmentItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  receivedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetRetailMargin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetWholesaleMargin?: number;

  @IsOptional()
  @IsIn(['capitalize', 'expense'])
  shortageHandlingMethod?: 'capitalize' | 'expense';
}

export class RecordForeignTransferDto {
  @IsString()
  supplierId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountEgp!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountForeign!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
