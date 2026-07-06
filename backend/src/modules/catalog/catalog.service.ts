import { Injectable } from '@nestjs/common';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { UpsertCategoryDto } from './dto/upsert-category.dto';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { CatalogCategoryService } from './services/catalog-category.service';
import { CatalogProductService } from './services/catalog-product.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly categoryService: CatalogCategoryService,
    private readonly productService: CatalogProductService,
  ) {}

  listCategories(actor: AuthContext): Promise<Record<string, unknown>> { return this.categoryService.listCategories(actor); }
  createCategory(payload: UpsertCategoryDto, actor: AuthContext): Promise<Record<string, unknown>> { return this.categoryService.createCategory(payload, actor); }
  updateCategory(id: number, payload: UpsertCategoryDto, actor: AuthContext): Promise<Record<string, unknown>> { return this.categoryService.updateCategory(id, payload, actor); }
  deleteCategory(id: number, actor: AuthContext): Promise<Record<string, unknown>> { return this.categoryService.deleteCategory(id, actor); }
  transferCategoryProducts(id: number, toCategoryId: number, actor: AuthContext): Promise<Record<string, unknown>> { return this.categoryService.transferProducts(id, toCategoryId, actor); }
  listProducts(query: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> { return this.productService.listProducts(query, actor); }
  getProduct(id: number, actor: AuthContext): Promise<Record<string, unknown>> { return this.productService.getProduct(id, actor); }
  listPosProducts(query: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> { return this.productService.listPosProducts(query, actor); }
  createProduct(payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> { return this.productService.createProduct(payload, actor); }
  updateProduct(id: number, payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> { return this.productService.updateProduct(id, payload, actor); }
  deleteProduct(id: number, actor: AuthContext): Promise<Record<string, unknown>> { return this.productService.deleteProduct(id, actor); }
  getNextStyleCode(actor: AuthContext): Promise<{ styleCode: string }> { return this.productService.getNextStyleCode(actor); }
  allocateStyleCode(actor: AuthContext): Promise<{ styleCode: string }> { return this.productService.allocateStyleCode(actor); }
}
