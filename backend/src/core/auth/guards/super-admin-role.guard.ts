import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithAuth } from '../interfaces/request-with-auth.interface';
import { isPlatformTenantId } from '../utils/tenant-boundary';

@Injectable()
export class SuperAdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const auth = request.authContext;

    if (!auth) {
      throw new ForbiddenException('Authentication required');
    }

    const isPlatformTenant = isPlatformTenantId(auth.tenantId);

    if (auth.role !== 'super_admin' || !isPlatformTenant) {
      throw new ForbiddenException('Only SaaS Platform Super Admin can access this resource');
    }

    return true;
  }
}
