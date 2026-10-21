import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LogsController } from './logs.controller';
import { InMemoryRateLimitService } from '../../common/security/in-memory-rate-limit.service';

@Global()
@Module({
  controllers: [LogsController],
  providers: [LoggerService, InMemoryRateLimitService],
  exports: [LoggerService],
})
export class LoggingModule {}
