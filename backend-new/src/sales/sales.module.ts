import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthFoundationModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
