import { Body, Controller, Post, Get, Headers, UnauthorizedException } from '@nestjs/common';
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

  @Get('feature-plans')
  async listFeaturePlans(@Headers('x-master-password') masterPasswordHeader?: string) {
    const masterPassword = this.configService.get<string>('DEVELOPER_MASTER_PASSWORD') || process.env.DEVELOPER_MASTER_PASSWORD;
    if (!masterPassword || !masterPasswordHeader || !safeCompare(masterPasswordHeader, masterPassword)) {
      throw new UnauthorizedException('Developer access unauthorized');
    }
    return this.saasAdminService.developerListFeaturePlans();
  }

  @Post('update-plan')
  async updatePlan(@Body() body: DeveloperUpdatePlanDto) {
    const masterPassword = this.configService.get<string>('DEVELOPER_MASTER_PASSWORD') || process.env.DEVELOPER_MASTER_PASSWORD;
    if (!masterPassword || !body.masterPassword || !safeCompare(body.masterPassword, masterPassword)) {
      throw new UnauthorizedException('Invalid master password');
    }
    return this.saasAdminService.developerUpdateTenantPlan(body);
  }
}
