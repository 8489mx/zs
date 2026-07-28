import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../../core/audit/audit.module';
import { AddonsController } from './addons.controller';
import { AddonsService } from './addons.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AddonsController],
  providers: [AddonsService],
})
export class AddonsModule {}
