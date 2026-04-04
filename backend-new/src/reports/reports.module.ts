import { Module } from '@nestjs/common';
import { AuthFoundationModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
