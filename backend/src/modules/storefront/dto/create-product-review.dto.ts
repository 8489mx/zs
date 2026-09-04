import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProductReviewDto {
  @IsNotEmpty({ message: 'التقييم مطلوب' })
  @IsInt({ message: 'التقييم يجب أن يكون رقماً صحيحاً بين 1 و 5' })
  @Min(1, { message: 'أقل تقييم هو 1 نجمة' })
  @Max(5, { message: 'أقصى تقييم هو 5 نجوم' })
  rating!: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
