import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ServicePayloadDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsIn(['cash', 'card'])
  paymentChannel?: 'cash' | 'card';
}

export class UpsertServiceDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ServicePayloadDto)
  service!: ServicePayloadDto;
}
