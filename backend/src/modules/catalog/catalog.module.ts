import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogCategoryService } from './services/catalog-category.service';
import { CatalogProductService } from './services/catalog-product.service';
import { ProductSerialsService } from './services/product-serials.service';

@Module({
  imports: [AuditModule, InventoryModule, AccountingModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogCategoryService, CatalogProductService, ProductSerialsService],
  exports: [ProductSerialsService],
})
export class CatalogModule {}
