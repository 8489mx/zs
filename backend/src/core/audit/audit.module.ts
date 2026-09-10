import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { TamperAuditService } from './tamper-audit.service';
import { TamperAuditController } from './tamper-audit.controller';

@Global()
@Module({
  controllers: [TamperAuditController],
  providers: [AuditService, TamperAuditService],
  exports: [AuditService, TamperAuditService],
})
export class AuditModule {}
