import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsAdminController } from './controllers/settings-admin.controller';
import { SettingsAdminService } from './services/settings-admin.service';
import { SettingsBackupController } from './controllers/settings-backup.controller';
import { SettingsBackupService } from './services/settings-backup.service';
import { SettingsImportController } from './controllers/settings-import.controller';
import { SettingsImportService } from './services/settings-import.service';
import { OfflineReleasesAdminController, OfflineUpdatesPublicController } from './controllers/offline-releases.controller';
import { OfflineReleasesService } from './services/offline-releases.service';

@Module({
  controllers: [
    SettingsController,
    SettingsAdminController,
    SettingsBackupController,
    SettingsImportController,
    OfflineReleasesAdminController,
    OfflineUpdatesPublicController,
  ],
  providers: [
    SettingsService,
    SettingsAdminService,
    SettingsBackupService,
    SettingsImportService,
    OfflineReleasesService,
  ],
})
export class SettingsModule {}

