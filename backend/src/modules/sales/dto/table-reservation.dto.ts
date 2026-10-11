import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class CreateTableReservationDto {
  @IsNotEmpty()
  @IsString()
  tableNumber: string;

  @IsNotEmpty()
  @IsString()
  guestName: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsNumber()
  guestCount?: number;

  @IsNotEmpty()
  @IsString()
  reservationTime: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}

export class UpdateTableReservationStatusDto {
  @IsNotEmpty()
  @IsIn(['confirmed', 'seated', 'cancelled', 'no_show'])
  status: 'confirmed' | 'seated' | 'cancelled' | 'no_show';
}
