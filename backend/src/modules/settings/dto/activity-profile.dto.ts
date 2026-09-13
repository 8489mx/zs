import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateActivityProfileDto {
  @IsString()
  @IsNotEmpty()
  activityType!: string;
}
