import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CreateTrialTenantDto, ExtendTrialDto, ListSaasTenantsQueryDto, TenantStatusActionDto } from './dto/saas-admin.dto';
import { SaasAdminService } from './saas-admin.service';

@Controller('api/saas-admin')
@UseGuards(SessionAuthGuard)
export class SaasAdminController {
  constructor(private readonly service: SaasAdminService) {}

  @Get('tenants')
  listTenants(@Query() query: ListSaasTenantsQueryDto, @Req() req: RequestWithAuth) {
    return this.service.listTenants(query, req.authContext!);
  }

  @Get('tenants/:id')
  getTenantById(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.service.getTenantById(id, req.authContext!);
  }

  @Post('tenants/trial')
  createTrialTenant(@Body() body: CreateTrialTenantDto, @Req() req: RequestWithAuth) {
    return this.service.createTrialTenant(body, req.authContext!);
  }

  @Post('tenants/:id/activate')
  activateTenant(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.service.activateTenant(id, req.authContext!);
  }

  @Post('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string, @Body() body: TenantStatusActionDto, @Req() req: RequestWithAuth) {
    return this.service.suspendTenant(id, body, req.authContext!);
  }

  @Post('tenants/:id/expire')
  expireTenant(@Param('id') id: string, @Body() body: TenantStatusActionDto, @Req() req: RequestWithAuth) {
    return this.service.expireTenant(id, body, req.authContext!);
  }

  @Post('tenants/:id/extend-trial')
  extendTrial(@Param('id') id: string, @Body() body: ExtendTrialDto, @Req() req: RequestWithAuth) {
    return this.service.extendTrial(id, body, req.authContext!);
  }
}
