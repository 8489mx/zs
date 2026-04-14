import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogCategoryService } from './services/catalog-category.service';
import { CatalogProductService } from './services/catalog-product.service';

@Module({
  imports: [AuditModule, InventoryModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogCategoryService, CatalogProductService],
})
export class CatalogModule {}
