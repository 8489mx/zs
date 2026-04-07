import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { UpsertCategoryDto } from './dto/upsert-category.dto';
import { NormalizedProductOffer, NormalizedUpsertProduct, UpsertProductDto } from './dto/upsert-product.dto';

type ProductRow = {
  id: number;
  name: string;
  barcode: string | null;
  category_id: number | null;
  supplier_id: number | null;
  cost_price: string | number;
  retail_price: string | number;
  wholesale_price: string | number;
  stock_qty: string | number;
  min_stock_qty: string | number;
  notes: string;
};

@Injectable()
export class CatalogService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  private hasPermission(actor: AuthContext | undefined, permission: string): boolean {
    return actor?.role === 'super_admin' || Boolean(actor?.permissions?.includes(permission));
  }

  async listCategories(): Promise<Record<string, unknown>> {
    const categories = await this.db
      .selectFrom('product_categories')
      .select(['id', 'name'])
      .where('is_active', '=', true)
      .orderBy('id asc')
      .execute();

    return {
      categories: categories.map((entry) => ({
        id: String(entry.id),
        name: entry.name,
      })),
    };
  }

  async createCategory(payload: UpsertCategoryDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Category name is required', 'CATEGORY_NAME_REQUIRED', 400);

    const duplicate = await this.db
      .selectFrom('product_categories')
      .select('id')
      .where(sql`LOWER(name)`, '=', name.toLowerCase())
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (duplicate) throw new AppError('Category already exists', 'CATEGORY_EXISTS', 400);

    await this.db.insertInto('product_categories').values({ name, is_active: true }).execute();
    await this.audit.log('إضافة تصنيف', `تم إضافة تصنيف ${name} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      ...(await this.listCategories()),
    };
  }

  async updateCategory(id: number, payload: UpsertCategoryDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Category name is required', 'CATEGORY_NAME_REQUIRED', 400);

    const existing = await this.db
      .selectFrom('product_categories')
      .select(['id'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!existing) throw new AppError('Category not found', 'CATEGORY_NOT_FOUND', 404);

    const duplicate = await this.db
      .selectFrom('product_categories')
      .select('id')
      .where(sql`LOWER(name)`, '=', name.toLowerCase())
      .where('id', '!=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (duplicate) throw new AppError('Category already exists', 'CATEGORY_EXISTS', 400);

    await this.db
      .updateTable('product_categories')
      .set({
        name,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('تعديل تصنيف', `تم تحديث تصنيف #${id} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      ...(await this.listCategories()),
    };
  }

  async deleteCategory(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const inUse = await this.db
      .selectFrom('products')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('category_id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirstOrThrow();

    if (Number(inUse.count || 0) > 0) {
      throw new AppError('Category is used by products', 'CATEGORY_IN_USE', 400);
    }

    await this.db
      .updateTable('product_categories')
      .set({
        is_active: false,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('حذف تصنيف', `تم حذف تصنيف #${id} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      ...(await this.listCategories()),
    };
  }

  async listProducts(query: Record<string, unknown>, actor?: AuthContext): Promise<Record<string, unknown>> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(5, Number(query.pageSize || 20)));
    const q = String(query.q || '').trim().toLowerCase();
    const view = String(query.view || 'all');

    const canViewCost = this.hasPermission(actor, 'canViewCost');

    const products = (await this.db
      .selectFrom('products')
      .select([
        'id',
        'name',
        'barcode',
        'category_id',
        'supplier_id',
        'cost_price',
        'retail_price',
        'wholesale_price',
        'stock_qty',
        'min_stock_qty',
        'notes',
      ])
      .where('is_active', '=', true)
      .orderBy('id desc')
      .execute()) as ProductRow[];

    const units = await this.db
      .selectFrom('product_units')
      .select(['id', 'product_id', 'name', 'multiplier', 'barcode', 'is_base_unit', 'is_sale_unit_default', 'is_purchase_unit_default'])
      .orderBy('product_id asc')
      .orderBy('is_base_unit desc')
      .orderBy('id asc')
      .execute();

    const offers = await this.db
      .selectFrom('product_offers')
      .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date'])
      .where('is_active', '=', true)
      .orderBy('id desc')
      .execute();

    const customerPrices = await this.db
      .selectFrom('product_customer_prices')
      .select(['id', 'product_id', 'customer_id', 'price'])
      .orderBy('id desc')
      .execute();

    const categories = await this.db
      .selectFrom('product_categories')
      .select(['id', 'name'])
      .where('is_active', '=', true)
      .execute();

    const suppliers = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name'])
      .where('is_active', '=', true)
      .execute();

    const categoriesById = Object.fromEntries(categories.map((entry) => [String(entry.id), String(entry.name || '')]));
    const suppliersById = Object.fromEntries(suppliers.map((entry) => [String(entry.id), String(entry.name || '')]));

    const unitsByProduct = new Map<string, Record<string, unknown>[]>();
    for (const unit of units) {
      const key = String(unit.product_id);
      if (!unitsByProduct.has(key)) unitsByProduct.set(key, []);
      unitsByProduct.get(key)!.push({
        id: String(unit.id),
        name: unit.name,
        multiplier: Number(unit.multiplier || 1),
        barcode: unit.barcode || '',
        isBaseUnit: Boolean(unit.is_base_unit),
        isSaleUnit: Boolean(unit.is_sale_unit_default),
        isPurchaseUnit: Boolean(unit.is_purchase_unit_default),
      });
    }

    const offersByProduct = new Map<string, Record<string, unknown>[]>();
    for (const offer of offers) {
      const key = String(offer.product_id);
      if (!offersByProduct.has(key)) offersByProduct.set(key, []);
      offersByProduct.get(key)!.push({
        id: String(offer.id),
        type: offer.offer_type,
        value: Number(offer.value || 0),
        from: offer.start_date ? String(offer.start_date) : '',
        to: offer.end_date ? String(offer.end_date) : '',
      });
    }

    const pricesByProduct = new Map<string, Record<string, unknown>[]>();
    for (const cp of customerPrices) {
      const key = String(cp.product_id);
      if (!pricesByProduct.has(key)) pricesByProduct.set(key, []);
      pricesByProduct.get(key)!.push({
        id: String(cp.id),
        customerId: String(cp.customer_id),
        price: Number(cp.price || 0),
      });
    }

    let rows = products.map((p) => {
      const mapped: Record<string, unknown> = {
        id: String(p.id),
        name: p.name || '',
        barcode: p.barcode || '',
        categoryId: p.category_id ? String(p.category_id) : '',
        supplierId: p.supplier_id ? String(p.supplier_id) : '',
        costPrice: Number(p.cost_price || 0),
        retailPrice: Number(p.retail_price || 0),
        wholesalePrice: Number(p.wholesale_price || 0),
        stock: Number(p.stock_qty || 0),
        minStock: Number(p.min_stock_qty || 0),
        notes: p.notes || '',
        units:
          unitsByProduct.get(String(p.id)) ||
          [{ id: `base-${p.id}`, name: 'قطعة', multiplier: 1, barcode: p.barcode || '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
        offers: offersByProduct.get(String(p.id)) || [],
        customerPrices: pricesByProduct.get(String(p.id)) || [],
      };

      if (!canViewCost) {
        delete mapped.costPrice;
      }

      return mapped;
    });

    if (view !== 'all') {
      rows = rows.filter((row) => {
        const stock = Number(row.stock || 0);
        const minStock = Number(row.minStock || 0);
        if (view === 'low') return stock <= minStock;
        if (view === 'out') return stock <= 0;
        if (view === 'offers') return Array.isArray(row.offers) && row.offers.length > 0;
        if (view === 'special') return Array.isArray(row.customerPrices) && row.customerPrices.length > 0;
        return true;
      });
    }

    if (q) {
      rows = rows.filter((row) => {
        const unitValues = Array.isArray(row.units)
          ? row.units.flatMap((unit) => [String((unit as Record<string, unknown>).name || ''), String((unit as Record<string, unknown>).barcode || '')])
          : [];
        const haystack = [
          String(row.name || ''),
          String(row.barcode || ''),
          categoriesById[String(row.categoryId || '')] || '',
          suppliersById[String(row.supplierId || '')] || '',
          String(row.notes || ''),
          ...unitValues,
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pagedRows = rows.slice(start, start + pageSize);

    return {
      products: pagedRows,
      pagination: {
        page: safePage,
        pageSize,
        totalItems: total,
        totalPages,
      },
      summary: {
        totalProducts: total,
        lowStockCount: rows.filter((row) => Number(row.stock || 0) <= Number(row.minStock || 0)).length,
        outOfStockCount: rows.filter((row) => Number(row.stock || 0) <= 0).length,
        inventoryCost: canViewCost
          ? rows.reduce((sum, row) => sum + (Number(row.stock || 0) * Number(row.costPrice || 0)), 0)
          : null,
        inventorySaleValue: rows.reduce((sum, row) => sum + (Number(row.stock || 0) * Number(row.retailPrice || 0)), 0),
        activeOffersCount: rows.reduce((sum, row) => sum + Number((row.offers as unknown[] | undefined)?.length || 0), 0),
        customerPriceCount: rows.reduce((sum, row) => sum + Number((row.customerPrices as unknown[] | undefined)?.length || 0), 0),
      },
    };
  }

  private normalizeProductPayload(payload: UpsertProductDto): NormalizedUpsertProduct {
    const units = payload.units?.length
      ? payload.units
      : [{ name: 'قطعة', multiplier: 1, barcode: payload.barcode || '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }];

    const normalizedUnits = units.map((unit, index) => ({
      name: String(unit.name || '').trim() || (index === 0 ? 'قطعة' : 'وحدة'),
      multiplier: Number(unit.multiplier || 1),
      barcode: String(unit.barcode || '').trim(),
      isBaseUnit: Boolean(unit.isBaseUnit) || Number(unit.multiplier || 1) === 1 || index === 0,
      isSaleUnit: Boolean(unit.isSaleUnit),
      isPurchaseUnit: Boolean(unit.isPurchaseUnit),
    }));

    if (!normalizedUnits.some((unit) => unit.isBaseUnit)) {
      normalizedUnits[0].isBaseUnit = true;
      normalizedUnits[0].multiplier = 1;
    }

    const baseUnits = normalizedUnits.filter((unit) => unit.isBaseUnit);
    if (baseUnits.length !== 1) throw new AppError('Product must have exactly one base unit', 'INVALID_UNITS', 400);
    baseUnits[0].multiplier = 1;

    if (!normalizedUnits.some((unit) => unit.isSaleUnit)) baseUnits[0].isSaleUnit = true;
    if (!normalizedUnits.some((unit) => unit.isPurchaseUnit)) baseUnits[0].isPurchaseUnit = true;
    if (normalizedUnits.filter((unit) => unit.isSaleUnit).length !== 1) {
      throw new AppError('Choose exactly one default sale unit', 'INVALID_UNITS', 400);
    }
    if (normalizedUnits.filter((unit) => unit.isPurchaseUnit).length !== 1) {
      throw new AppError('Choose exactly one default purchase unit', 'INVALID_UNITS', 400);
    }

    const seenNames = new Set<string>();
    const seenBarcodes = new Set<string>();
    for (const unit of normalizedUnits) {
      if (!(Number(unit.multiplier || 0) > 0)) throw new AppError('Unit multiplier must be greater than zero', 'INVALID_UNITS', 400);
      const nameKey = unit.name.toLowerCase();
      if (seenNames.has(nameKey)) throw new AppError('Unit names must be unique per product', 'INVALID_UNITS', 400);
      seenNames.add(nameKey);

      if (unit.barcode) {
        if (seenBarcodes.has(unit.barcode)) throw new AppError('Unit barcodes must be unique per product', 'INVALID_UNITS', 400);
        seenBarcodes.add(unit.barcode);
      }
    }

    const offers: NormalizedProductOffer[] = (payload.offers || [])
      .map((offer): NormalizedProductOffer => ({
        type: offer.type === 'fixed' ? 'fixed' : 'percent',
        value: Number(offer.value || 0),
        from: offer.from || null,
        to: offer.to || null,
      }))
      .filter((offer) => offer.value > 0);

    const customerPrices = (payload.customerPrices || [])
      .map((entry) => ({
        customerId: Number(entry.customerId || 0),
        price: Number(entry.price || 0),
      }))
      .filter((entry) => entry.customerId > 0);

    return {
      name: String(payload.name || '').trim(),
      barcode: String(payload.barcode || '').trim(),
      categoryId: payload.categoryId ? Number(payload.categoryId) : null,
      supplierId: payload.supplierId ? Number(payload.supplierId) : null,
      costPrice: Number(payload.costPrice || 0),
      retailPrice: Number(payload.retailPrice || 0),
      wholesalePrice: Number(payload.wholesalePrice || 0),
      minStock: Number(payload.minStock || 0),
      notes: String(payload.notes || '').trim(),
      units: normalizedUnits,
      offers,
      customerPrices,
      ...(payload.stock !== undefined && payload.stock !== null ? { stock: Number(payload.stock || 0) } : {}),
    };
  }

  private async ensureProductIdentityAvailable(payload: NormalizedUpsertProduct, productId?: number): Promise<void> {
    if (payload.name) {
      let query = this.db
        .selectFrom('products')
        .select('id')
        .where(sql`LOWER(name)`, '=', payload.name.toLowerCase())
        .where('is_active', '=', true);
      if (productId) query = query.where('id', '!=', productId);
      const existing = await query.executeTakeFirst();
      if (existing) throw new AppError('Product already exists', 'PRODUCT_EXISTS', 400);
    }

    if (payload.barcode) {
      let query = this.db
        .selectFrom('products')
        .select('id')
        .where(sql`LOWER(barcode)`, '=', payload.barcode.toLowerCase())
        .where('is_active', '=', true);
      if (productId) query = query.where('id', '!=', productId);
      const existing = await query.executeTakeFirst();
      if (existing) throw new AppError('Barcode already exists', 'BARCODE_EXISTS', 400);
    }
  }

  private async replaceProductRelations(productId: number, payload: NormalizedUpsertProduct): Promise<void> {
    await this.db.deleteFrom('product_units').where('product_id', '=', productId).execute();
    await this.db.deleteFrom('product_offers').where('product_id', '=', productId).execute();
    await this.db.deleteFrom('product_customer_prices').where('product_id', '=', productId).execute();

    for (const unit of payload.units) {
      await this.db
        .insertInto('product_units')
        .values({
          product_id: productId,
          name: unit.name,
          multiplier: unit.multiplier,
          barcode: unit.barcode || null,
          is_base_unit: unit.isBaseUnit,
          is_sale_unit_default: unit.isSaleUnit,
          is_purchase_unit_default: unit.isPurchaseUnit,
        })
        .execute();
    }

    for (const offer of payload.offers) {
      await this.db
        .insertInto('product_offers')
        .values({
          product_id: productId,
          offer_type: offer.type,
          value: offer.value,
          start_date: offer.from,
          end_date: offer.to,
          is_active: true,
        })
        .execute();
    }

    for (const price of payload.customerPrices) {
      await this.db
        .insertInto('product_customer_prices')
        .values({
          product_id: productId,
          customer_id: price.customerId,
          price: price.price,
        })
        .execute();
    }
  }

  async createProduct(payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const normalized = this.normalizeProductPayload(payload);
    if (!normalized.name) throw new AppError('Product name is required', 'PRODUCT_NAME_REQUIRED', 400);

    await this.ensureProductIdentityAvailable(normalized);

    const result = await this.db
      .insertInto('products')
      .values({
        name: normalized.name,
        barcode: normalized.barcode || null,
        category_id: normalized.categoryId,
        supplier_id: normalized.supplierId,
        price: normalized.retailPrice,
        cost: normalized.costPrice,
        stock: Number(normalized.stock || 0),
        cost_price: normalized.costPrice,
        retail_price: normalized.retailPrice,
        wholesale_price: normalized.wholesalePrice,
        stock_qty: Number(normalized.stock || 0),
        min_stock_qty: normalized.minStock,
        notes: normalized.notes,
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const productId = Number(result.id);
    await this.replaceProductRelations(productId, normalized);

    await this.audit.log('إضافة صنف', `تم إضافة الصنف ${normalized.name} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      products: (await this.listProducts({}, actor)).products,
    };
  }

  async updateProduct(id: number, payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db.selectFrom('products').selectAll().where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!existing) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);

    const normalized = this.normalizeProductPayload(payload);
    if (!normalized.name) throw new AppError('Product name is required', 'PRODUCT_NAME_REQUIRED', 400);

    await this.ensureProductIdentityAvailable(normalized, id);

    const priceChanged =
      Number(normalized.costPrice || 0) !== Number(existing.cost_price || existing.cost || 0) ||
      Number(normalized.retailPrice || 0) !== Number(existing.retail_price || existing.price || 0) ||
      Number(normalized.wholesalePrice || 0) !== Number(existing.wholesale_price || 0);
    if (priceChanged && !this.hasPermission(actor, 'canEditPrice')) {
      throw new AppError('Price changes require canEditPrice permission', 'PRICE_CHANGE_FORBIDDEN', 403);
    }

    if (normalized.stock !== undefined && normalized.stock !== null) {
      throw new AppError('Stock cannot be edited from product master data. Use inventory adjustment.', 'STOCK_UPDATE_FORBIDDEN', 400);
    }

    await this.db
      .updateTable('products')
      .set({
        name: normalized.name,
        barcode: normalized.barcode || null,
        category_id: normalized.categoryId,
        supplier_id: normalized.supplierId,
        price: normalized.retailPrice,
        cost: normalized.costPrice,
        cost_price: normalized.costPrice,
        retail_price: normalized.retailPrice,
        wholesale_price: normalized.wholesalePrice,
        min_stock_qty: normalized.minStock,
        notes: normalized.notes,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.replaceProductRelations(id, normalized);
    await this.audit.log('تعديل صنف', `تم تحديث الصنف #${id} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      products: (await this.listProducts({}, actor)).products,
    };
  }

  async deleteProduct(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const product = await this.db
      .selectFrom('products')
      .select(['id', 'stock_qty'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);

    if (Math.abs(Number(product.stock_qty || 0)) > 0.0001) {
      throw new AppError('Product still has stock on hand', 'PRODUCT_HAS_STOCK', 400);
    }

    const movementCount = await this.db
      .selectFrom('stock_movements')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('product_id', '=', id)
      .executeTakeFirstOrThrow();

    if (Number(movementCount.count || 0) > 0) {
      throw new AppError('Product has transaction history and cannot be deleted', 'PRODUCT_HAS_HISTORY', 400);
    }

    await this.db
      .updateTable('products')
      .set({
        is_active: false,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('حذف صنف', `تم حذف الصنف #${id} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      products: (await this.listProducts({}, actor)).products,
    };
  }
}
