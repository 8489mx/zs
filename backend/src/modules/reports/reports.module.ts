import { Module } from '@nestjs/common';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsAdminService } from './services/reports-admin.service';
import { ReportsLedgerService } from './services/reports-ledger.service';
import { ReportsSummaryService } from './services/reports-summary.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsSummaryService, ReportsLedgerService, ReportsAdminService],
})
export class ReportsModule {}
