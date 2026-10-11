import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateTableServiceCallDto {
  @IsString()
  @IsNotEmpty()
  tableNumber!: string;

  @IsOptional()
  @IsString()
  @IsIn(['waiter', 'bill', 'water', 'clean'])
  callType?: 'waiter' | 'bill' | 'water' | 'clean';

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
