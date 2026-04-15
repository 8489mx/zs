import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

class ProductUnitDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  multiplier!: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @Type(() => Boolean)
  @IsBoolean()
  isBaseUnit!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  isSaleUnit!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  isPurchaseUnit!: boolean;
}

class ProductOfferDto {
  @IsIn(['percent', 'fixed', 'price'])
  type!: 'percent' | 'fixed' | 'price';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minQty?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

class ProductCustomerPriceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;
}

class ProductFashionVariantDto {
  @IsString()
  color!: string;

  @IsString()
  size!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;
}

export class UpsertProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsIn(['standard', 'fashion'])
  itemKind?: 'standard' | 'fashion';

  @IsOptional()
  @IsString()
  styleCode?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retailPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wholesalePrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductUnitDto)
  units!: ProductUnitDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductOfferDto)
  offers?: ProductOfferDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProductCustomerPriceDto)
  customerPrices?: ProductCustomerPriceDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => ProductFashionVariantDto)
  fashionVariants?: ProductFashionVariantDto[];
}

export type NormalizedProductUnit = {
  name: string;
  multiplier: number;
  barcode: string;
  isBaseUnit: boolean;
  isSaleUnit: boolean;
  isPurchaseUnit: boolean;
};

export type NormalizedProductOffer = {
  type: 'percent' | 'fixed' | 'price';
  value: number;
  minQty: number;
  from: string | null;
  to: string | null;
};

export type NormalizedProductCustomerPrice = {
  customerId: number;
  price: number;
};

export type NormalizedFashionVariant = {
  color: string;
  size: string;
  barcode: string;
  stock: number;
};

export type NormalizedUpsertProduct = {
  name: string;
  barcode: string;
  itemKind: 'standard' | 'fashion';
  styleCode: string;
  color: string;
  size: string;
  categoryId: number | null;
  supplierId: number | null;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
  notes: string;
  units: NormalizedProductUnit[];
  offers: NormalizedProductOffer[];
  customerPrices: NormalizedProductCustomerPrice[];
  fashionVariants: NormalizedFashionVariant[];
  stock?: number;
};
