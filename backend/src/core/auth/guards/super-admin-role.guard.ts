import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithAuth } from '../interfaces/request-with-auth.interface';

@Injectable()
export class SuperAdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const auth = request.authContext;

    if (!auth) {
      throw new ForbiddenException('Authentication required');
    }

    const platformTenantId = String(process.env.PLATFORM_TENANT_ID || 'default').trim();
    const isPlatformTenant = ['default', 'dev-tenant', platformTenantId].includes(String(auth.tenantId || '').trim());

    if (auth.role !== 'super_admin' || !isPlatformTenant) {
      throw new ForbiddenException('Only SaaS Platform Super Admin can access this resource');
    }

    return true;
  }
}

