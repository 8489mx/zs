import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { AuditModule } from '../../core/audit/audit.module';
import { SaasAdminController } from './saas-admin.controller';
import { SaasAdminService } from './saas-admin.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule, AuditModule],
  controllers: [SaasAdminController],
  providers: [SaasAdminService],
})
export class SaasAdminModule {}
