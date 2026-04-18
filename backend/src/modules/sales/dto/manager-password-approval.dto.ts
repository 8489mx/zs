import { IsString, MaxLength } from 'class-validator';

export class ManagerPasswordApprovalDto {
  @IsString()
  @MaxLength(255)
  password!: string;
}
