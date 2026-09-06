import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { HrTreasuryAdapter } from './hr-treasury.adapter';
import { MobileAttendanceService } from './mobile-attendance.service';
import { MobileAttendanceController } from './mobile-attendance.controller';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeePortalController } from './employee-portal.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule, AccountingModule],
  controllers: [HrController, MobileAttendanceController, EmployeePortalController],
  providers: [HrService, HrTreasuryAdapter, MobileAttendanceService, EmployeePortalService],
  exports: [MobileAttendanceService, EmployeePortalService],
})
export class HrModule {}

