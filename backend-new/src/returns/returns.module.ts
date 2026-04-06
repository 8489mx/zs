import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthFoundationModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
