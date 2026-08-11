import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../../core/auth/services/permission.service';
import { REQUIRED_PERMISSIONS_KEY } from '../../../core/auth/decorators/permissions.decorator';
import { REQUIRED_FEATURE_KEY } from '../../../core/auth/decorators/feature.decorator';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { ConfigService } from '@nestjs/config';
import { PlanFeatureService } from '../services/plan-feature.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
    private readonly planFeatureService: PlanFeatureService,
    private readonly configService: ConfigService,
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

    const isPlatformAdmin = 
      auth?.role === 'super_admin' && 
      this.configService.get<string>('APP_MODE') === 'CLOUD_SAAS' && 
      auth?.tenantId === this.configService.get<string>('PLATFORM_TENANT_ID');

    // Platform Admins (SaaS Owners) skip everything
    if (isPlatformAdmin) {
      return true;
    }

    const granted = auth?.permissions ?? [];
    
    // For everyone else (including offline super_admins), check basic permissions first.
    // Note: Offline super_admin will pass this check because they possess SUPER_ADMIN_PERMISSIONS in their DB profile.
    if (!this.permissionService.hasAllPermissions(granted, required)) {
      throw new ForbiddenException('Missing required permissions');
    }

    // Now STRICTLY check feature gates for everyone except Platform Admin
    if (requiredFeature && auth) {
      if (!this.planFeatureService.hasFeature(auth.planId, auth.extraFeatures, requiredFeature)) {
        throw new ForbiddenException('هذه الميزة غير متاحة في باقتك الحالية. يرجى الترقية.');
      }
    }

    return true;
  }
}
