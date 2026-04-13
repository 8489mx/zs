import { IsNotEmpty, IsString } from 'class-validator';

export class ActivateAppDto {
  @IsString()
  @IsNotEmpty()
  activationCode!: string;
}
