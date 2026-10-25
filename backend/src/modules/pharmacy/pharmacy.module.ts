import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PurchasesModule } from '../purchases/purchases.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PurchasesModule, AccountingModule],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
