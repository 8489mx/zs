import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RequestWithAuth } from '../interfaces/request-with-auth.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const granted = request.authContext?.permissions ?? [];

    if (!this.permissionService.hasAllPermissions(granted, required)) {
      throw new ForbiddenException('Missing required permissions');
    }

    return true;
  }
}
