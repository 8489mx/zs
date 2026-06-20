import { IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../core/auth/utils/password-policy';

export class ChangePasswordDto {
  @IsString()
  oldPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword!: string;
}
