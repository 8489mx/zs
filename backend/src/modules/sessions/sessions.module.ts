import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { ActivationModule } from '../activation/activation.module';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [AuditModule, ActivationModule],
  controllers: [SessionsController],
})
export class SessionsModule {}
