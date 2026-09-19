import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateGoodsReceiptLineDto {
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
  @IsOptional()
  @IsInt()
  purchaseOrderItemId?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  productId!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  orderedQty!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  receivedQty!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  acceptedQty!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  rejectedQty!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
  @IsOptional()
  @IsInt()
  quarantineLocationId?: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
  @IsOptional()
  @IsInt()
  coaDocumentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateGoodsReceiptDto {
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
  @IsOptional()
  @IsInt()
  purchaseOrderId?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  supplierId!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  locationId!: number;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierDeliveryNoteRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptLineDto)
  lines!: CreateGoodsReceiptLineDto[];
}

export class VerifyThreeWayMatchDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  tolerancePercentage?: number;

  @IsOptional()
  @IsBoolean()
  isServiceItem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serviceCompletionRef?: string;

  @IsOptional()
  @IsBoolean()
  allowOverride?: boolean;

  /**
   * 'price_only' clears price-tolerance blocks; 'full' also clears quantity/GRN blocks and is
   * restricted to admin roles. Defaults to the narrower scope when omitted.
   */
  @IsOptional()
  @IsString()
  @IsIn(['price_only', 'full'])
  overrideScope?: 'price_only' | 'full';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}
