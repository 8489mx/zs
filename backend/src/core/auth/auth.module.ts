import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { SessionService } from './services/session.service';
import { BootstrapAdminService } from './services/bootstrap-admin.service';
import { AdminRoleGuard } from './guards/admin-role.guard';

@Global()
@Module({
  providers: [SessionService, PermissionService, BootstrapAdminService, AdminRoleGuard],
  exports: [SessionService, PermissionService, AdminRoleGuard],
})
export class AuthFoundationModule {}
