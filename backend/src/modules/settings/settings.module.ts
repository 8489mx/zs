import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, BranchesController],
  providers: [SettingsService],
})
export class SettingsModule {}
