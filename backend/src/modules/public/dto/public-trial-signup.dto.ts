import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class PublicTrialSignupDto {
  @IsString()
  @Length(2, 80)
  businessName!: string;

  @IsString()
  @Length(6, 30)
  ownerPhone!: string;

  @IsString()
  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  honeypot?: string;
}

