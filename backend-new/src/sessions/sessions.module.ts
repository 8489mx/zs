import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [AuditModule],
  controllers: [SessionsController],
})
export class SessionsModule {}
