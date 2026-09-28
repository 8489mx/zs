import { Module } from '@nestjs/common';
import { AiCopilotController } from './ai-copilot.controller';
import { AiCopilotService } from './ai-copilot.service';
import { AiKnowledgeService } from './services/ai-knowledge.service';
import { AiAgentService } from './services/ai-agent.service';

@Module({
  controllers: [AiCopilotController],
  providers: [AiCopilotService, AiKnowledgeService, AiAgentService],
  exports: [AiCopilotService, AiKnowledgeService, AiAgentService],
})
export class AiCopilotModule {}
