import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { AiCopilotService, CopilotResponse } from './ai-copilot.service';

@Controller('api/ai-copilot')
@UseGuards(SessionAuthGuard)
export class AiCopilotController {
  constructor(private readonly copilotService: AiCopilotService) {}

  @Post('ask')
  ask(
    @Body('question') question: string,
    @Req() req: RequestWithAuth,
  ): Promise<CopilotResponse> {
    return this.copilotService.ask(question, req.authContext!);
  }
}
