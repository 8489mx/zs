const fs = require('fs');
let c = fs.readFileSync('c:/zn/backend/src/modules/hr/dto/hr.dto.ts', 'utf8');

c = c.replace('IsDateString, IsIn', 'IsBoolean, IsDateString, IsIn');

const props = `
  @IsOptional()
  @IsString()
  attendancePolicy?: string;

  @IsOptional()
  @IsString()
  commissionType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commissionValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commissionTarget?: number;

  @IsOptional()
  @IsString()
  delayPolicy?: string;

  @IsOptional()
  @IsBoolean()
  hasSocialInsurance?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  insuranceSalary?: number;

  @IsOptional()
  @IsBoolean()
  hasIncomeTax?: boolean;
}
`;

c = c.replace('  notes?: string;\r\n}', '  notes?: string;' + props);
c = c.replace('  notes?: string;\n}', '  notes?: string;' + props);

const dtos = `
export class UpsertHolidayDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class EndOfServiceDto {
  @IsDateString()
  endOfServiceDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  endOfServiceReason?: string;
}
`;

c += dtos;
fs.writeFileSync('c:/zn/backend/src/modules/hr/dto/hr.dto.ts', c);
console.log('done');
