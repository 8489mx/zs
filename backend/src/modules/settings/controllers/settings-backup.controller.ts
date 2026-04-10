import { Body, Controller, Get, ParseBoolPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { AdminRoleGuard } from '../../../core/auth/guards/admin-role.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { SettingsBackupService } from '../services/settings-backup.service';
import { BackupEnvelopeDto } from '../dto/backup-envelope.dto';

@Controller('api')
@UseGuards(SessionAuthGuard, AdminRoleGuard)
export class SettingsBackupController {
  constructor(private readonly backupService: SettingsBackupService) {}

  @Get('backup')
  getBackup(@Req() _req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.backupService.exportBackup();
  }

  @Get('backup-snapshots')
  listSnapshots(@Req() _req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.backupService.listSnapshots();
  }

  @Post('backup/verify')
  verifyBackup(@Body() payload: BackupEnvelopeDto, @Req() _req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.backupService.verifyBackup(payload);
  }

  @Post('backup/restore')
  restoreBackup(
    @Body() payload: BackupEnvelopeDto,
    @Req() req: RequestWithAuth,
    @Query('dryRun', new ParseBoolPipe({ optional: true })) dryRun?: boolean,
  ): Promise<Record<string, unknown>> {
    return this.backupService.restoreBackup(payload, req.authContext!, dryRun ?? false);
  }
}
