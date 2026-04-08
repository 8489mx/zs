import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('api')
@UseGuards(SessionAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  private assertSettingsPermission(req: RequestWithAuth): void {
    const permissions = req.authContext?.permissions ?? [];
    if (!permissions.includes('canManageSettings') && !permissions.includes('settings') && req.authContext?.role !== 'super_admin') {
      throw new ForbiddenException('Missing required permissions');
    }
  }

  @Get('settings')
  getSettings(): Promise<Record<string, unknown>> {
    return this.settingsService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() payload: UpdateSettingsDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.saveSettings(payload.settings, req.authContext!);
  }

  @Get('branches')
  listBranches(): Promise<Record<string, unknown>> {
    return this.settingsService.listBranches();
  }

  @Post('branches')
  createBranch(@Body() payload: { name?: string; code?: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.createBranch(payload, req.authContext!);
  }

  @Put('branches/:id')
  updateBranch(@Param('id') id: string, @Body() payload: { name?: string; code?: string }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.updateBranch(Number(id), payload, req.authContext!);
  }

  @Delete('branches/:id')
  deleteBranch(@Param('id') id: string, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.deleteBranch(Number(id), req.authContext!);
  }

  @Get('locations')
  listLocations(): Promise<Record<string, unknown>> {
    return this.settingsService.listLocations();
  }

  @Post('locations')
  createLocation(@Body() payload: { name?: string; code?: string; branchId?: string | number | null }, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.createLocation(payload, req.authContext!);
  }

  @Put('locations/:id')
  updateLocation(
    @Param('id') id: string,
    @Body() payload: { name?: string; code?: string; branchId?: string | number | null },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.updateLocation(Number(id), payload, req.authContext!);
  }

  @Delete('locations/:id')
  deleteLocation(@Param('id') id: string, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.deleteLocation(Number(id), req.authContext!);
  }
}
