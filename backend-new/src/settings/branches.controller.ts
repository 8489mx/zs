import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SettingsService } from './settings.service';

@Controller('api')
@UseGuards(SessionAuthGuard)
export class BranchesController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('branches')
  listBranches(): Promise<Record<string, unknown>> {
    return this.settingsService.listBranches();
  }
}
