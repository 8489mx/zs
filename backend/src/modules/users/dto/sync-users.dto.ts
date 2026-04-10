import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { UpsertUserDto } from './upsert-user.dto';

export class SyncUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpsertUserDto)
  users!: UpsertUserDto[];
}
