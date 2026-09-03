import { Module } from '@nestjs/common';
import { AiCopilotController } from './ai-copilot.controller';
import { AiCopilotService } from './ai-copilot.service';

@Module({
  controllers: [AiCopilotController],
  providers: [AiCopilotService],
  exports: [AiCopilotService],
})
export class AiCopilotModule {}
