import { Body, Controller, ForbiddenException, Get, Put, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('api/settings')
@UseGuards(SessionAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(): Promise<Record<string, unknown>> {
    return this.settingsService.getSettings();
  }

  @Put()
  updateSettings(@Body() payload: UpdateSettingsDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const permissions = req.authContext?.permissions ?? [];
    if (!permissions.includes('canManageSettings') && !permissions.includes('settings')) {
      throw new ForbiddenException('Missing required permissions');
    }

    return this.settingsService.saveSettings(payload.settings, req.authContext!);
  }
}
