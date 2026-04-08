import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { SettingsBackupService } from '../services/settings-backup.service';

@Controller('api')
@UseGuards(SessionAuthGuard)
export class SettingsBackupController {
  constructor(private readonly backupService: SettingsBackupService) {}

  @Get('backup')
  getBackup(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.backupService.assertAdmin(req.authContext);
    return this.backupService.exportBackup();
  }

  @Get('backup-snapshots')
  listSnapshots(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.backupService.assertAdmin(req.authContext);
    return this.backupService.listSnapshots();
  }

  @Post('backup/verify')
  verifyBackup(@Body() payload: unknown, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    this.backupService.assertAdmin(req.authContext);
    return this.backupService.verifyBackup(payload);
  }

  @Post('backup/restore')
  restoreBackup(@Body() payload: unknown, @Req() req: RequestWithAuth, @Query('dryRun') dryRun?: string): Promise<Record<string, unknown>> {
    this.backupService.assertAdmin(req.authContext);
    return this.backupService.restoreBackup(payload, req.authContext!, dryRun === 'true');
  }
}
