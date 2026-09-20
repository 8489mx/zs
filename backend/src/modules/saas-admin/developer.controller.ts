import { Body, Controller, Post, Get, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { SaasAdminService } from './saas-admin.service';
import { DeveloperUpdatePlanDto } from './dto/developer-update-plan.dto';

// Deliberately 1, matching MIN_PASSWORD_LENGTH in core/auth/utils/password-policy.ts and
// the project's standing decision that a one-character password is acceptable (O35).
// What still matters here is that there is NO built-in value: an unset variable leaves the
// panel disabled rather than accepting a password published in the repository (F16).
const MIN_MASTER_PASSWORD_LENGTH = 1;

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Controller('api/developer')
export class DeveloperController {
  constructor(
    private readonly saasAdminService: SaasAdminService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * These endpoints grant any plan and any feature set to any tenant, so they exist only
   * for the offline/desktop build. The check is an allow-list, not a CLOUD_SAAS deny-list:
   * an unreadable or unexpected mode must disable the panel, never enable it (F12).
   * Same shape as `isDesktopMode()` in core/auth/utils/portal-token.ts.
   */
  private assertDeveloperAccessAllowed(): void {
    const appMode = String(
      this.configService.get<string>('APP_MODE') || this.configService.get<string>('app.mode') || '',
    )
      .trim()
      .toUpperCase();

    const isDesktopMode =
      appMode === 'SELF_CONTAINED' ||
      appMode === 'LOCAL_PILOT' ||
      appMode === 'PORTABLE' ||
      process.env.PORTABLE_MODE === 'true' ||
      process.env.IS_ELECTRON === 'true';

    if (!isDesktopMode) {
      throw new ForbiddenException('Developer endpoints are only available in the offline desktop build');
    }
  }

  /**
   * Fail closed on the secret. This used to end in `|| 'infoadmin'`, so the endpoint that
   * unlocks every paid module shipped with a working password published in the repository,
   * and setting nothing on the server left it usable (F16). There is no default any more:
   * an unset DEVELOPER_MASTER_PASSWORD disables the panel outright.
   *
   * The length floor is 1 by project decision (O35), so whatever the operator sets is
   * accepted. That is a deliberate trade: the value in an operator's own .env is theirs to
   * choose, but the build must never ship one.
   */
  private resolveMasterPassword(): string {
    const configured = String(
      this.configService.get<string>('DEVELOPER_MASTER_PASSWORD') || process.env.DEVELOPER_MASTER_PASSWORD || '',
    ).trim();

    if (configured.length < MIN_MASTER_PASSWORD_LENGTH) {
      throw new ForbiddenException(
        'لوحة المطورين معطّلة: DEVELOPER_MASTER_PASSWORD غير مضبوط أو أقصر من الحد الأدنى على هذا الخادم.',
      );
    }

    return configured;
  }

  @Get('feature-plans')
  async listFeaturePlans() {
    this.assertDeveloperAccessAllowed();
    return this.saasAdminService.developerListFeaturePlans();
  }

  @Post('update-plan')
  async updatePlan(@Body() body: DeveloperUpdatePlanDto) {
    this.assertDeveloperAccessAllowed();
    const masterPassword = this.resolveMasterPassword();
    if (!body.masterPassword || !safeCompare(String(body.masterPassword), masterPassword)) {
      throw new UnauthorizedException('Invalid master password');
    }
    return this.saasAdminService.developerUpdateTenantPlan(body);
  }
}
