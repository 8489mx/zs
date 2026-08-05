import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { SessionService } from './services/session.service';
import { PlanFeatureService } from './services/plan-feature.service';
import { BootstrapAdminService } from './services/bootstrap-admin.service';
import { AdminRoleGuard } from './guards/admin-role.guard';

@Global()
@Module({
  providers: [SessionService, PermissionService, PlanFeatureService, BootstrapAdminService, AdminRoleGuard],
  exports: [SessionService, PermissionService, PlanFeatureService, AdminRoleGuard],
})
export class AuthFoundationModule {}
