import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PackageItemLineDto {
  @IsNumber()
  productId!: number;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsArray()
  serialNumbers?: string[];
}

export class CreateWarehousePackageDto {
  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsEnum(['pallet', 'crate', 'carton', 'box'])
  packageType!: 'pallet' | 'crate' | 'carton' | 'box';

  @IsOptional()
  @IsString()
  parentPackageId?: string;

  @IsOptional()
  @IsNumber()
  warehouseId?: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grossWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  netWeightKg?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageItemLineDto)
  items?: PackageItemLineDto[];
}

export class UnpackPackageDto {
  @IsEnum(['unpack_all', 'remove_item', 'remove_child_package'])
  action!: 'unpack_all' | 'remove_item' | 'remove_child_package';

  @IsOptional()
  @IsString()
  targetPackageItemId?: string;

  @IsOptional()
  @IsString()
  targetChildPackageId?: string;
}

export class UpdatePackageStatusDto {
  @IsEnum(['sealed', 'opened', 'shipped', 'consumed'])
  status!: 'sealed' | 'opened' | 'shipped' | 'consumed';
}
