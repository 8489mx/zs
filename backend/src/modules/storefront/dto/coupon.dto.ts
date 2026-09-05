import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MinLength(2, { message: 'كود الكوبون يجب ألا يقل عن حرفين' })
  code!: string;

  @IsString()
  @IsIn(['percentage', 'fixed', 'free_shipping'], {
    message: 'نوع الخصم يجب أن يكون percentage أو fixed أو free_shipping',
  })
  discountType!: 'percentage' | 'fixed' | 'free_shipping';

  @IsNumber()
  @Min(0, { message: 'قيمة الخصم يجب أن تكون 0 أو أكثر' })
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed', 'free_shipping'])
  discountType?: 'percentage' | 'fixed' | 'free_shipping';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ValidateCouponDto {
  @IsString()
  code!: string;

  @IsNumber()
  @Min(0)
  subtotal!: number;
}
