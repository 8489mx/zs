import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryAdjustmentService } from './services/inventory-adjustment.service';
import { InventoryCountService } from './services/inventory-count.service';
import { InventoryScopeService } from './services/inventory-scope.service';
import { InventoryTransferService } from './services/inventory-transfer.service';

@Module({
  imports: [AuditModule],
  controllers: [InventoryController],
  providers: [InventoryScopeService, InventoryTransferService, InventoryCountService, InventoryAdjustmentService, InventoryService],
  exports: [InventoryScopeService],
})
export class InventoryModule {}
