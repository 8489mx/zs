import { Body, Controller, Post, Get, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { SaasAdminService } from './saas-admin.service';
import { DeveloperUpdatePlanDto } from './dto/developer-update-plan.dto';

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

  private assertDeveloperAccessAllowed(): void {
    const appMode = String(this.configService.get<string>('APP_MODE') || this.configService.get<string>('app.mode') || '').trim().toUpperCase();
    if (appMode === 'CLOUD_SAAS') {
      throw new ForbiddenException('Developer endpoints are disabled in CLOUD_SAAS mode');
    }
  }

  @Get('feature-plans')
  async listFeaturePlans() {
    this.assertDeveloperAccessAllowed();
    return this.saasAdminService.developerListFeaturePlans();
  }

  @Post('update-plan')
  async updatePlan(@Body() body: DeveloperUpdatePlanDto) {
    this.assertDeveloperAccessAllowed();
    const masterPassword = this.configService.get<string>('DEVELOPER_MASTER_PASSWORD') || process.env.DEVELOPER_MASTER_PASSWORD || 'infoadmin';
    if (!masterPassword || !body.masterPassword || !safeCompare(body.masterPassword, masterPassword)) {
      throw new UnauthorizedException('Invalid master password');
    }
    return this.saasAdminService.developerUpdateTenantPlan(body);
  }
}
