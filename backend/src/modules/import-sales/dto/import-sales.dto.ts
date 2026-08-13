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
}

export class UpdateShipmentCostsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCostUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shippingAccountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customsCostEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customsAccountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  internalTransportCostEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  transportAccountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchangeRateAtArrival?: number;

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
  targetMarginPercent?: number;
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
