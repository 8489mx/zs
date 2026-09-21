import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CustomerOrderRefDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  orderNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;
}

export class CustomerOrderLookupDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CustomerOrderRefDto)
  orders!: CustomerOrderRefDto[];
}
