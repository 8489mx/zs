import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsNotEmpty({ message: 'حالة التذكرة مطلوبة' })
  @IsString()
  status!: 'received' | 'inspecting' | 'in_progress' | 'repaired' | 'delivered' | 'unrepairable' | 'cancelled';

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  collectedAmount?: number;

  @IsOptional()
  @IsString()
  technicianNotes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'instapay';
}

export class AddTicketPartDto {
  @IsNotEmpty({ message: 'الصنف / قطعة الغيار مطلوبة' })
  @IsNumber()
  productId!: number;

  @IsNotEmpty({ message: 'اسم قطعة الغيار مطلوب' })
  @IsString()
  productName!: string;

  @IsNotEmpty({ message: 'الكمية مطلوبة' })
  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsNotEmpty({ message: 'سعر بيع القطعة مطلوب' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;
}
