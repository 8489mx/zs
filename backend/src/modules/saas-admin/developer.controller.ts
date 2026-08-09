import { Body, Controller, Post, Get, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SaasAdminService } from './saas-admin.service';
import { DeveloperUpdatePlanDto } from './dto/developer-update-plan.dto';

@Controller('api/developer')
export class DeveloperController {
  constructor(
    private readonly saasAdminService: SaasAdminService,
    private readonly configService: ConfigService,
  ) {}

  @Get('feature-plans')
  async listFeaturePlans() {
    return this.saasAdminService.developerListFeaturePlans();
  }

  @Post('update-plan')
  async updatePlan(@Body() body: DeveloperUpdatePlanDto) {
    const masterPassword = this.configService.get<string>('DEVELOPER_MASTER_PASSWORD') || process.env.DEVELOPER_MASTER_PASSWORD;
    if (!masterPassword || body.masterPassword !== masterPassword) {
      throw new UnauthorizedException('Invalid master password');
    }
    return this.saasAdminService.developerUpdateTenantPlan(body);
  }
}
