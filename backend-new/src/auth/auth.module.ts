import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { SessionService } from './services/session.service';

@Global()
@Module({
  providers: [SessionService, PermissionService],
  exports: [SessionService, PermissionService],
})
export class AuthFoundationModule {}
