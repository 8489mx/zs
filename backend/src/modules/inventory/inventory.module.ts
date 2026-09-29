import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryAdjustmentService } from './services/inventory-adjustment.service';
import { InventoryCountService } from './services/inventory-count.service';
import { InventoryScopeService } from './services/inventory-scope.service';
import { InventoryTransferService } from './services/inventory-transfer.service';

import { InventoryReplenishmentService } from './services/inventory-replenishment.service';
import { WarehouseBinsService } from './services/warehouse-bins.service';
import { WarehouseBinsController } from './controllers/warehouse-bins.controller';
import { WarehousePackagesController } from './controllers/warehouse-packages.controller';
import { WarehousePackagesService } from './services/warehouse-packages.service';
import { QualityAssuranceController } from './controllers/quality-assurance.controller';
import { QualityAssuranceService } from './services/quality-assurance.service';

@Module({
  imports: [AuditModule, AccountingModule],
  controllers: [
    InventoryController,
    WarehouseBinsController,
    WarehousePackagesController,
    QualityAssuranceController,
  ],
  providers: [
    InventoryScopeService,
    InventoryTransferService,
    InventoryCountService,
    InventoryAdjustmentService,
    InventoryReplenishmentService,
    InventoryService,
    WarehouseBinsService,
    WarehousePackagesService,
    QualityAssuranceService,
  ],
  exports: [
    InventoryScopeService,
    InventoryReplenishmentService,
    WarehouseBinsService,
    WarehousePackagesService,
    QualityAssuranceService,
  ],
})
export class InventoryModule {}
