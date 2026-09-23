import { IsString, Length, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../core/auth/utils/password-policy';

/** رمز من تطبيق المصادقة (6 أرقام) أو رمز استرداد (19 محرفاً بالشُّرَط). */
export class MfaCodeDto {
  @IsString()
  @Length(6, 32)
  code!: string;
}

export class MfaLoginDto {
  @IsString()
  @Length(20, 2000)
  mfaToken!: string;

  @IsString()
  @Length(6, 32)
  code!: string;
}

export class DisableMfaDto {
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  currentPassword!: string;

  @IsString()
  @Length(6, 32)
  code!: string;
}
