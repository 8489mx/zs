import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BranchPayloadDto } from './dto/branch-payload.dto';
import { LocationPayloadDto } from './dto/location-payload.dto';

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
  createBranch(@Body() payload: BranchPayloadDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.createBranch(payload, req.authContext!);
  }

  @Put('branches/:id')
  updateBranch(@Param('id', ParseIntPipe) id: number, @Body() payload: BranchPayloadDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.updateBranch(id, payload, req.authContext!);
  }

  @Delete('branches/:id')
  deleteBranch(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.deleteBranch(id, req.authContext!);
  }

  @Get('settings/locations')
  listLocations(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.listLocations();
  }

  @Post('settings/locations')
  createLocation(@Body() payload: LocationPayloadDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.createLocation(payload, req.authContext!);
  }

  @Put('settings/locations/:id')
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: LocationPayloadDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.updateLocation(id, payload, req.authContext!);
  }

  @Delete('settings/locations/:id')
  deleteLocation(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.assertSettingsPermission(req);
    return this.settingsService.deleteLocation(id, req.authContext!);
  }
}
