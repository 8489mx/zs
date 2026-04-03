import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertUserDto {
  @IsOptional()
  id?: string | number;

  @IsString()
  @MinLength(1)
  username!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsString()
  @IsIn(['super_admin', 'admin', 'cashier'])
  role!: 'super_admin' | 'admin' | 'cashier';

  @IsOptional()
  @IsArray()
  permissions?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  branchIds?: string[];

  @IsOptional()
  @IsString()
  defaultBranchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
