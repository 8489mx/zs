import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryTransferDto {
  @IsNotEmpty({ message: 'القسم مطلوب' })
  @IsNumber({}, { message: 'معرف القسم يجب أن يكون رقما' })
  @Type(() => Number)
  categoryId!: number;

  @IsNotEmpty({ message: 'المخزن المحول منه مطلوب' })
  @IsNumber({}, { message: 'معرف المخزن يجب أن يكون رقما' })
  @Type(() => Number)
  fromLocationId!: number;

  @IsNotEmpty({ message: 'المخزن المحول إليه مطلوب' })
  @IsNumber({}, { message: 'معرف المخزن يجب أن يكون رقما' })
  @Type(() => Number)
  toLocationId!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
