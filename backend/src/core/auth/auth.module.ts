import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { SessionService } from './services/session.service';
import { BootstrapAdminService } from './services/bootstrap-admin.service';

@Global()
@Module({
  providers: [SessionService, PermissionService, BootstrapAdminService],
  exports: [SessionService, PermissionService],
})
export class AuthFoundationModule {}
