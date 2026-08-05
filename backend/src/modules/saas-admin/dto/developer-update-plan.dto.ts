import { IsArray, IsOptional, IsString } from 'class-validator';

export class DeveloperUpdatePlanDto {
  @IsString()
  masterPassword!: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extraFeatures?: string[];
}
