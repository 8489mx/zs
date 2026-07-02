import { Controller, Post, Body, Req } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Controller('api/logs')
export class LogsController {
  constructor(private readonly logger: LoggerService) {}

  @Post('frontend-error')
  logFrontendError(@Body() payload: any, @Req() req: any) {
    this.logger.error({
      source: 'frontend',
      ip: req.ip,
      payload
    }, 'Frontend Error Logged');
    
    return { ok: true };
  }
}
