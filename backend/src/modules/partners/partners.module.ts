import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { AccountingModule } from '../accounting/accounting.module';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [AuditModule, AccountingModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
