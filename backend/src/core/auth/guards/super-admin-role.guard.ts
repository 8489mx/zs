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

    if (auth.role !== 'super_admin') {
      throw new ForbiddenException('Only SaaS Super Admin can access this resource');
    }

    return true;
  }
}
