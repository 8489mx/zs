import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min, IsIn, Matches, IsArray, ValidateNested } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  containerNumber!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  arrivalDate?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  billOfLading?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  shippingDate?: string;
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
  @Min(0)
  customsCostEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  internalTransportCostEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchangeRateAtArrival?: number;

  @IsOptional()
  @IsIn(['Pending', 'In Customs', 'Arrived'])
  status?: string;
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

export class RecordForeignTransferDto {
  @IsString()
  supplierId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amountEgp!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amountForeign!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
