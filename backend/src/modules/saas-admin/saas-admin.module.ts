import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthFoundationModule } from '../../core/auth/auth.module';
import { AuditModule } from '../../core/audit/audit.module';
import { SaasAdminController } from './saas-admin.controller';
import { DeveloperController } from './developer.controller';
import { SaasDiagnosticsController } from './saas-diagnostics.controller';
import { SaasAdminService } from './saas-admin.service';
import { TrialTenantProvisioningService } from './trial-tenant-provisioning.service';
import { SaasDiagnosticsService } from './saas-diagnostics.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule, AuditModule],
  controllers: [SaasAdminController, DeveloperController, SaasDiagnosticsController],
  providers: [SaasAdminService, TrialTenantProvisioningService, SaasDiagnosticsService],
  exports: [TrialTenantProvisioningService, SaasDiagnosticsService],
})
export class SaasAdminModule {}

