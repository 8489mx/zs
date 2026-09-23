import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../core/auth/utils/password-policy';

export class RequestPasswordResetDto {
  @IsString()
  @IsEmail()
  @Length(5, 190)
  email!: string;

  /** كود/معرّف المنشأة، اختياري: يُستخدم فقط حين يملك نفس البريد أكثر من منشأة. */
  @IsOptional()
  @IsString()
  @Length(1, 120)
  companyCode?: string;
}

export class ValidatePasswordResetTokenDto {
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @Length(20, 200)
  token!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword!: string;
}
