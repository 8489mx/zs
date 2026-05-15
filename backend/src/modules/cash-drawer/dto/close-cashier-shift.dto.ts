import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class CloseOperationDetailDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class CloseCashierShiftDto {
  @Transform(({ value }) => Number(value)) @IsNumber() countedCash!: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() @Min(0) cardDeclaredTotal?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) cardOperationCount?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() @Min(0) walletDeclaredTotal?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) walletOperationCount?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() @Min(0) instapayDeclaredTotal?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) instapayOperationCount?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => CloseOperationDetailDto) @Transform(({ value }) => Array.isArray(value) ? value : []) cardDetails?: CloseOperationDetailDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => CloseOperationDetailDto) @Transform(({ value }) => Array.isArray(value) ? value : []) walletDetails?: CloseOperationDetailDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => CloseOperationDetailDto) @Transform(({ value }) => Array.isArray(value) ? value : []) instapayDetails?: CloseOperationDetailDto[];
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsString() @MaxLength(100) managerPin!: string;
}
