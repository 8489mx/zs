import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../../core/auth/services/permission.service';
import { REQUIRED_PERMISSIONS_KEY } from '../../../core/auth/decorators/permissions.decorator';
import { REQUIRED_FEATURE_KEY } from '../../../core/auth/decorators/feature.decorator';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { PlanFeatureService } from '../services/plan-feature.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
    private readonly planFeatureService: PlanFeatureService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRED_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowAuth = this.reflector.getAllAndOverride<boolean>('allow_authenticated', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required && !allowAuth) {
      throw new Error(`Endpoint ${context.getClass().name}.${context.getHandler().name} is protected by PermissionsGuard but lacks @RequirePermissions or @AllowAuthenticated marker.`);
    }

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const auth = request.authContext;

    if (auth?.role === 'super_admin') {
      return true;
    }

    const granted = auth?.permissions ?? [];
    if (!this.permissionService.hasAllPermissions(granted, required)) {
      throw new ForbiddenException('Missing required permissions');
    }

    if (requiredFeature && auth) {
      if (!this.planFeatureService.hasFeature(auth.planId, auth.extraFeatures, requiredFeature)) {
        throw new ForbiddenException('هذه الميزة غير متاحة في باقتك الحالية. يرجى الترقية.');
      }
    }

    return true;
  }
}
