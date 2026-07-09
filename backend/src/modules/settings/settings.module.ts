import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsAdminController } from './controllers/settings-admin.controller';
import { SettingsAdminService } from './services/settings-admin.service';
import { SettingsBackupController } from './controllers/settings-backup.controller';
import { SettingsBackupService } from './services/settings-backup.service';
import { SettingsSupportService } from './services/settings-support.service';
import { SettingsSupportController } from './controllers/settings-support.controller';
import { SettingsImportController } from './controllers/settings-import.controller';
import { SettingsImportService } from './services/settings-import.service';
import { OfflineReleasesAdminController,
    OfflineUpdatesPublicController,
    OfflineUpdatesProtectedController } from './controllers/offline-releases.controller';
import { OfflineReleasesService } from './services/offline-releases.service';

@Module({
  controllers: [
    SettingsController,
    SettingsAdminController,
    SettingsBackupController,
    SettingsSupportController,
    SettingsImportController,
    OfflineReleasesAdminController,
    OfflineUpdatesPublicController,
  ],
  providers: [
    SettingsService,
    SettingsAdminService,
    SettingsBackupService,
    SettingsSupportService,
    SettingsImportService,
    OfflineReleasesService,
  ],
})
export class SettingsModule {}

