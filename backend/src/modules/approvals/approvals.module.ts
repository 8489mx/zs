import { Module } from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalWorkflowController } from './approval-workflow.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [ApprovalWorkflowController],
  providers: [ApprovalWorkflowService],
  exports: [ApprovalWorkflowService],
})
export class ApprovalsModule {}
