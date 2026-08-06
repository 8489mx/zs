import { Body, Controller, Post, Get, UnauthorizedException } from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { DeveloperUpdatePlanDto } from './dto/developer-update-plan.dto';

@Controller('api/developer')
export class DeveloperController {
  constructor(private readonly saasAdminService: SaasAdminService) {}

  @Get('feature-plans')
  async listFeaturePlans() {
    return this.saasAdminService.developerListFeaturePlans();
  }

  @Post('update-plan')
  async updatePlan(@Body() body: DeveloperUpdatePlanDto) {
    const masterPassword = process.env.DEVELOPER_MASTER_PASSWORD;
    if (!masterPassword || body.masterPassword !== masterPassword) {
      throw new UnauthorizedException('Invalid master password');
    }
    return this.saasAdminService.developerUpdateTenantPlan(body);
  }
}
