import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { TaxSettingsService, TaxSettingsDto } from '../../services/tax-settings/tax-settings.service';
import { SessionAuthGuard } from '../../../../core/auth/guards/session-auth.guard';
import { RequirePermissions } from '../../../../core/auth/decorators/permissions.decorator';

@Controller('api/tax-settings')
@UseGuards(SessionAuthGuard)
export class TaxSettingsController {
  constructor(private readonly taxSettingsService: TaxSettingsService) {}

  @Get()
  @RequirePermissions('settings.view')
  async getSettings(@Req() req: any) {
    const tenantId = req.authContext?.tenantId || req.tenantId;
    const settings = await this.taxSettingsService.getSettings(tenantId);
    return {
      status: 'success',
      settings
    };
  }

  @Post()
  @RequirePermissions('settings.edit')
  async updateSettings(@Req() req: any, @Body() payload: TaxSettingsDto) {
    if (!payload.provider) {
      payload.provider = 'ETA_EGYPT';
    }
    const tenantId = req.authContext?.tenantId || req.tenantId;
    const accountId = req.authContext?.accountId || req.accountId;
    const settings = await this.taxSettingsService.upsertSettings(tenantId, accountId, payload);
    return {
      status: 'success',
      settings
    };
  }
}
