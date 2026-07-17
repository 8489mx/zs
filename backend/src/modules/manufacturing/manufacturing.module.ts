import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ManufacturingService } from './services/manufacturing.service';
import { ManufacturingController } from './controllers/manufacturing.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [DatabaseModule, InventoryModule, AccountingModule],
  providers: [ManufacturingService],
  controllers: [ManufacturingController],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
