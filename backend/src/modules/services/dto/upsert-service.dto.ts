import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

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
}

export class UpsertServiceDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ServicePayloadDto)
  service!: ServicePayloadDto;
}
