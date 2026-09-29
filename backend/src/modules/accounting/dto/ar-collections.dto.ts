import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsIn, Min, MaxLength } from 'class-validator';

export class ArCollectionsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  levelId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class CreateCollectionLogDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['call', 'whatsapp', 'visit', 'letter', 'dispute', 'promise_to_pay', 'other'])
  interactionType: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['sent', 'answered', 'promise_to_pay', 'no_answer', 'disputed', 'refused', 'escalated', 'settled'])
  resultStatus: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @IsOptional()
  @IsString()
  promisedDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promisedAmount?: number;

  @IsOptional()
  @IsString()
  nextFollowupDate?: string;
}

export class RecordPromiseToPayDto {
  @IsString()
  @IsNotEmpty()
  promisedDate: string;

  @IsNumber()
  @Min(0.01)
  promisedAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ToggleCreditBlockDto {
  @IsBoolean()
  block: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDunningLevelDto {
  @IsOptional()
  @IsString()
  levelName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  daysPastDue?: number;

  @IsOptional()
  @IsBoolean()
  autoBlockSales?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['whatsapp', 'manual_call', 'legal', 'email'])
  actionType?: string;

  @IsOptional()
  @IsString()
  templateText?: string;
}
