import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BackupMetaDto {
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  exportedAt?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class BackupEnvelopeDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BackupMetaDto)
  meta?: BackupMetaDto;

  @IsOptional()
  @IsObject()
  tables?: Record<string, unknown[]>;
}
