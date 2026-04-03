import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthFoundationModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthFoundationModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
