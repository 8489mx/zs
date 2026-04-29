import { Module } from '@nestjs/common';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { ManagerActionsController } from './manager-actions.controller';
import { ManagerDashboardService } from './manager-dashboard.service';
import { ManagerActionsService } from './manager-actions.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [ManagerActionsController],
  providers: [ManagerActionsService, ManagerDashboardService],
})
export class ManagerActionsModule {}
