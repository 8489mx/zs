import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
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

  @Get('config')
  getConfig(@Req() req: RequestWithAuth) {
    return this.copilotService.getConfig(req.authContext!);
  }

  @Post('config')
  saveConfig(
    @Body() body: { geminiApiKey?: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.copilotService.saveConfig(body, req.authContext!);
  }

  @Post('test-key')
  testKey(
    @Body('apiKey') apiKey: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.copilotService.testGeminiKey(apiKey, req.authContext!);
  }

  @Post('simulate-bot')
  simulateBot(
    @Body('question') question: string,
    @Req() req: RequestWithAuth,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    return this.copilotService.generateSalesBotReply({
      question,
      tenantId,
    });
  }
}

