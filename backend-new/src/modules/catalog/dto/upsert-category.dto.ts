import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
