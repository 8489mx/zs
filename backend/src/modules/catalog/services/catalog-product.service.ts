import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from 'kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { NormalizedFashionVariant, NormalizedProductOffer, NormalizedUpsertProduct, UpsertProductDto } from '../dto/upsert-product.dto';
import { InventoryScopeService } from '../../inventory/services/inventory-scope.service';
import { normalizeArabicInput, normalizeArabicSearch } from '../../../common/utils/arabic-search.util';

type ProductRow = {
  id: number;
  name: string;
  barcode: string | null;
  item_kind: 'standard' | 'fashion' | null;
  style_code: string | null;
  color: string | null;
  size: string | null;
  category_id: number | null;
  supplier_id: number | null;
  cost_price: string | number;
  retail_price: string | number;
  wholesale_price: string | number;
  stock_qty: string | number;
  min_stock_qty: string | number;
  notes: string;
};

type ProductWriteExecutor = Kysely<Database> | Transaction<Database>;
type ProductOfferColumnCapabilities = { hasMinQty: boolean };
type ProductOfferReadRow = {
  id: number;
  product_id: number;
  offer_type: string;
  value: string | number;
  start_date: string | null;
  end_date: string | null;
  min_qty?: string | number | null;
};

type ProductCountRow = {
  product_id: number;
  count: string | number | bigint;
};

type ProductUnitSearchRow = {
  product_id: number;
  name: string | null;
  barcode: string | null;
};

type ProductUnitReadRow = {
  id: number;
  product_id: number;
  name: string;
  multiplier: string | number;
  barcode: string | null;
  is_base_unit: boolean;
  is_sale_unit_default: boolean;
  is_purchase_unit_default: boolean;
};

type CustomerPriceReadRow = {
  id: number;
  product_id: number;
  customer_id: number;
  price: string | number;
};

@Injectable()
export class CatalogProductService {
  private productOfferColumnCapabilitiesPromise?: Promise<ProductOfferColumnCapabilities>;

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>, private readonly audit: AuditService, private readonly inventoryScope: InventoryScopeService) {}

  private hasPermission(actor: AuthContext | undefined, permission: string): boolean {
    return actor?.role === 'super_admin' || Boolean(actor?.permissions?.includes(permission));
  }

  private normalizeDateOnly(value: unknown): string {
    if (!value) return '';
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
    const text = String(value).trim();
    if (!text) return '';
    const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
  }

  private async getProductOfferColumnCapabilities(): Promise<ProductOfferColumnCapabilities> {
    if (!this.productOfferColumnCapabilitiesPromise) {
      this.productOfferColumnCapabilitiesPromise = sql<{ column_name: string }>`
          select column_name
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'product_offers'
        `
        .execute(this.db)
        .then((result) => {
          const columns = new Set(result.rows.map((row) => String(row.column_name || '').toLowerCase()));
          return { hasMinQty: columns.has('min_qty') };
        })
        .catch(() => ({ hasMinQty: false }));
    }
    return this.productOfferColumnCapabilitiesPromise;
  }

  private ensureAdvancedOffersSupported(payload: NormalizedUpsertProduct, capabilities: ProductOfferColumnCapabilities): void {
    const requiresAdvancedOfferSchema = payload.offers.some((offer) => offer.type === 'price' || Number(offer.minQty || 1) > 1);
    if (requiresAdvancedOfferSchema && !capabilities.hasMinQty) {
      throw new AppError(
        'Advanced product offers require the latest database migration. Run backend migrations first, then retry saving offers.',
        'PRODUCT_OFFERS_MIGRATION_REQUIRED',
        400,
      );
    }
  }

  async listProducts(query: Record<string, unknown>, actor?: AuthContext): Promise<Record<string, unknown>> {
    const { page, pageSize, q, view, requestedLocationId } = this.parseListProductsQuery(query);
    const canViewCost = this.hasPermission(actor, 'canViewCost');
    const offerCapabilities = await this.getProductOfferColumnCapabilities();
    const scopedLocation = requestedLocationId > 0 && actor ? await this.inventoryScope.assertLocationScope(requestedLocationId, actor) : null;

    const [products, categories, suppliers] = await Promise.all([
      this.db
        .selectFrom('products')
        .select(['id', 'name', 'barcode', 'item_kind', 'style_code', 'color', 'size', 'category_id', 'supplier_id', 'cost_price', 'retail_price', 'wholesale_price', 'stock_qty', 'min_stock_qty', 'notes'])
        .where('is_active', '=', true)
        .orderBy('id', 'desc')
        .execute() as Promise<ProductRow[]>,
      this.db.selectFrom('product_categories').select(['id', 'name']).where('is_active', '=', true).execute(),
      this.db.selectFrom('suppliers').select(['id', 'name']).where('is_active', '=', true).execute(),
    ]);

    const productIds = products.map((product) => Number(product.id));
    const scopedStockByProduct = await this.resolveScopedStockByProduct(productIds, scopedLocation?.id || null, products);
    const listContext = await this.buildListProductsContext(productIds, q, categories, suppliers);
    const filteredBaseRows = this.filterListProducts(products, { q, view, scopedLocationId: scopedLocation?.id || null, scopedStockByProduct, ...listContext });

    const total = filteredBaseRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pagedBaseRows = filteredBaseRows.slice(start, start + pageSize);
    const pagedIds = pagedBaseRows.map((row) => Number(row.id));

    const relations = await this.fetchListProductRelations(pagedIds, offerCapabilities.hasMinQty);
    const pagedRows = this.mapListProducts(pagedBaseRows, {
      canViewCost,
      scopedLocationId: scopedLocation?.id || null,
      scopedStockByProduct,
      unitsByProduct: relations.unitsByProduct,
      offersByProduct: relations.offersByProduct,
      pricesByProduct: relations.pricesByProduct,
    });

    return {
      products: pagedRows,
      pagination: { page: safePage, pageSize, totalItems: total, totalPages },
      summary: this.buildListSummary(filteredBaseRows, {
        canViewCost,
        scopedLocationId: scopedLocation?.id || null,
        scopedStockByProduct,
        offerCountByProduct: listContext.offerCountByProduct,
        customerPriceCountByProduct: listContext.customerPriceCountByProduct,
      }),
    };
  }

  private parseListProductsQuery(query: Record<string, unknown>) {
    return {
      page: Math.max(1, Number(query.page || 1)),
      pageSize: Math.min(100, Math.max(5, Number(query.pageSize || 20))),
      q: normalizeArabicSearch(query.q),
      view: String(query.view || 'all'),
      requestedLocationId: Number(query.locationId || 0),
    };
  }

  private async resolveScopedStockByProduct(productIds: number[], scopedLocationId: number | null, products: ProductRow[]): Promise<Map<string, number>> {
    const scopedStockByProduct = new Map<string, number>();
    if (!scopedLocationId || !productIds.length) return scopedStockByProduct;

    const stockRows = await this.db
      .selectFrom('product_location_stock as pls')
      .select(['pls.product_id', 'pls.location_id', 'pls.qty'])
      .where('pls.product_id', 'in', productIds)
      .where((eb) => eb.or([eb('pls.location_id', '=', scopedLocationId), eb('pls.location_id', 'is', null)]))
      .execute();

    const locationQtyByProduct = new Map<string, number>();
    const unassignedQtyByProduct = new Map<string, number>();
    for (const row of stockRows) {
      const key = String(row.product_id);
      const qty = Number(row.qty || 0);
      if (row.location_id == null) unassignedQtyByProduct.set(key, qty);
      if (Number(row.location_id || 0) === scopedLocationId) locationQtyByProduct.set(key, qty);
    }

    for (const product of products) {
      const key = String(product.id);
      scopedStockByProduct.set(key, Number((Number(locationQtyByProduct.get(key) || 0) + Number(unassignedQtyByProduct.get(key) || 0)).toFixed(3)));
    }

    return scopedStockByProduct;
  }

  private async buildListProductsContext(
    productIds: number[],
    q: string,
    categories: Array<{ id: number; name: string }>,
    suppliers: Array<{ id: number; name: string }>,
  ) {
    const [unitSearchRows, offerCountRows, customerPriceCountRows] = await Promise.all([
      q && productIds.length
        ? this.db
            .selectFrom('product_units')
            .select(['product_id', 'name', 'barcode'])
            .where('product_id', 'in', productIds)
            .orderBy('product_id', 'asc')
            .execute() as Promise<ProductUnitSearchRow[]>
        : Promise.resolve([]),
      productIds.length
        ? this.db
            .selectFrom('product_offers')
            .select(['product_id', (eb) => eb.fn.countAll<number>().as('count')])
            .where('is_active', '=', true)
            .where('product_id', 'in', productIds)
            .groupBy('product_id')
            .execute() as Promise<ProductCountRow[]>
        : Promise.resolve([]),
      productIds.length
        ? this.db
            .selectFrom('product_customer_prices')
            .select(['product_id', (eb) => eb.fn.countAll<number>().as('count')])
            .where('product_id', 'in', productIds)
            .groupBy('product_id')
            .execute() as Promise<ProductCountRow[]>
        : Promise.resolve([]),
    ]);

    const categoriesById = Object.fromEntries(categories.map((entry) => [String(entry.id), String(entry.name || '')]));
    const suppliersById = Object.fromEntries(suppliers.map((entry) => [String(entry.id), String(entry.name || '')]));
    const unitSearchValuesByProduct = new Map<string, string[]>();
    for (const unit of unitSearchRows) {
      const key = String(unit.product_id);
      if (!unitSearchValuesByProduct.has(key)) unitSearchValuesByProduct.set(key, []);
      unitSearchValuesByProduct.get(key)!.push(String(unit.name || ''), String(unit.barcode || ''));
    }

    const offerCountByProduct = new Map<string, number>();
    for (const row of offerCountRows) offerCountByProduct.set(String(row.product_id), Number(row.count || 0));

    const customerPriceCountByProduct = new Map<string, number>();
    for (const row of customerPriceCountRows) customerPriceCountByProduct.set(String(row.product_id), Number(row.count || 0));

    return {
      categoriesById,
      suppliersById,
      unitSearchValuesByProduct,
      offerCountByProduct,
      customerPriceCountByProduct,
    };
  }

  private filterListProducts(
    products: ProductRow[],
    context: {
      q: string;
      view: string;
      scopedLocationId: number | null;
      scopedStockByProduct: Map<string, number>;
      categoriesById: Record<string, string>;
      suppliersById: Record<string, string>;
      unitSearchValuesByProduct: Map<string, string[]>;
      offerCountByProduct: Map<string, number>;
      customerPriceCountByProduct: Map<string, number>;
    },
  ): ProductRow[] {
    return products.filter((product) => {
      const key = String(product.id);
      const stock = this.getListProductStock(product, context.scopedLocationId, context.scopedStockByProduct);
      const minStock = Number(product.min_stock_qty || 0);
      const offerCount = Number(context.offerCountByProduct.get(key) || 0);
      const customerPriceCount = Number(context.customerPriceCountByProduct.get(key) || 0);

      if (context.view !== 'all') {
        if (context.view === 'low' && !(stock <= minStock)) return false;
        if (context.view === 'out' && !(stock <= 0)) return false;
        if (context.view === 'offers' && offerCount <= 0) return false;
        if (context.view === 'special' && customerPriceCount <= 0) return false;
      }

      if (!context.q) return true;
      const haystack = [
        String(product.name || ''),
        String(product.barcode || ''),
        context.categoriesById[String(product.category_id || '')] || '',
        context.suppliersById[String(product.supplier_id || '')] || '',
        String(product.notes || ''),
        String(product.style_code || ''),
        String(product.color || ''),
        String(product.size || ''),
        ...(context.unitSearchValuesByProduct.get(key) || []),
      ].join(' ');
      return normalizeArabicSearch(haystack).includes(context.q);
    });
  }

  private async fetchListProductRelations(pagedIds: number[], hasMinQty: boolean) {
    const [units, offers, customerPrices] = pagedIds.length
      ? await Promise.all([
          this.db
            .selectFrom('product_units')
            .select(['id', 'product_id', 'name', 'multiplier', 'barcode', 'is_base_unit', 'is_sale_unit_default', 'is_purchase_unit_default'])
            .where('product_id', 'in', pagedIds)
            .orderBy('product_id', 'asc')
            .orderBy('is_base_unit', 'desc')
            .orderBy('id', 'asc')
            .execute() as Promise<ProductUnitReadRow[]>,
          hasMinQty
            ? this.db
                .selectFrom('product_offers')
                .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date', 'min_qty'])
                .where('is_active', '=', true)
                .where('product_id', 'in', pagedIds)
                .orderBy('id', 'desc')
                .execute() as Promise<ProductOfferReadRow[]>
            : this.db
                .selectFrom('product_offers')
                .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date'])
                .where('is_active', '=', true)
                .where('product_id', 'in', pagedIds)
                .orderBy('id', 'desc')
                .execute() as Promise<ProductOfferReadRow[]>,
          this.db
            .selectFrom('product_customer_prices')
            .select(['id', 'product_id', 'customer_id', 'price'])
            .where('product_id', 'in', pagedIds)
            .orderBy('id', 'desc')
            .execute() as Promise<CustomerPriceReadRow[]>,
        ])
      : [[], [], []];

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
        type: offer.offer_type === 'price' ? 'price' : offer.offer_type === 'fixed' ? 'fixed' : 'percent',
        value: Number(offer.value || 0),
        minQty: Math.max(1, Number(offer.min_qty || 1)),
        from: this.normalizeDateOnly(offer.start_date),
        to: this.normalizeDateOnly(offer.end_date),
      });
    }

    const pricesByProduct = new Map<string, Record<string, unknown>[]>();
    for (const cp of customerPrices) {
      const key = String(cp.product_id);
      if (!pricesByProduct.has(key)) pricesByProduct.set(key, []);
      pricesByProduct.get(key)!.push({ id: String(cp.id), customerId: String(cp.customer_id), price: Number(cp.price || 0) });
    }

    return { unitsByProduct, offersByProduct, pricesByProduct };
  }

  private mapListProducts(
    pagedBaseRows: ProductRow[],
    context: {
      canViewCost: boolean;
      scopedLocationId: number | null;
      scopedStockByProduct: Map<string, number>;
      unitsByProduct: Map<string, Record<string, unknown>[]>;
      offersByProduct: Map<string, Record<string, unknown>[]>;
      pricesByProduct: Map<string, Record<string, unknown>[]>;
    },
  ): Record<string, unknown>[] {
    return pagedBaseRows.map((product) => {
      const mapped: Record<string, unknown> = {
        id: String(product.id),
        name: product.name || '',
        barcode: product.barcode || '',
        categoryId: product.category_id ? String(product.category_id) : '',
        supplierId: product.supplier_id ? String(product.supplier_id) : '',
        itemKind: product.item_kind === 'fashion' ? 'fashion' : 'standard',
        styleCode: product.style_code || '',
        color: product.color || '',
        size: product.size || '',
        costPrice: Number(product.cost_price || 0),
        retailPrice: Number(product.retail_price || 0),
        wholesalePrice: Number(product.wholesale_price || 0),
        stock: this.getListProductStock(product, context.scopedLocationId, context.scopedStockByProduct),
        minStock: Number(product.min_stock_qty || 0),
        notes: product.notes || '',
        units: context.unitsByProduct.get(String(product.id)) || [{ id: `base-${product.id}`, name: 'قطعة', multiplier: 1, barcode: product.barcode || '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
        offers: context.offersByProduct.get(String(product.id)) || [],
        customerPrices: context.pricesByProduct.get(String(product.id)) || [],
      };
      if (!context.canViewCost) delete mapped.costPrice;
      return mapped;
    });
  }

  private buildListSummary(
    filteredBaseRows: ProductRow[],
    context: {
      canViewCost: boolean;
      scopedLocationId: number | null;
      scopedStockByProduct: Map<string, number>;
      offerCountByProduct: Map<string, number>;
      customerPriceCountByProduct: Map<string, number>;
    },
  ) {
    return {
      totalProducts: filteredBaseRows.length,
      lowStockCount: filteredBaseRows.filter((row) => this.getListProductStock(row, context.scopedLocationId, context.scopedStockByProduct) <= Number(row.min_stock_qty || 0)).length,
      outOfStockCount: filteredBaseRows.filter((row) => this.getListProductStock(row, context.scopedLocationId, context.scopedStockByProduct) <= 0).length,
      inventoryCost: context.canViewCost
        ? filteredBaseRows.reduce((sum, row) => sum + (this.getListProductStock(row, context.scopedLocationId, context.scopedStockByProduct) * Number(row.cost_price || 0)), 0)
        : null,
      inventorySaleValue: filteredBaseRows.reduce((sum, row) => sum + (this.getListProductStock(row, context.scopedLocationId, context.scopedStockByProduct) * Number(row.retail_price || 0)), 0),
      activeOffersCount: filteredBaseRows.reduce((sum, row) => sum + Number(context.offerCountByProduct.get(String(row.id)) || 0), 0),
      customerPriceCount: filteredBaseRows.reduce((sum, row) => sum + Number(context.customerPriceCountByProduct.get(String(row.id)) || 0), 0),
    };
  }

  private getListProductStock(product: ProductRow, scopedLocationId: number | null, scopedStockByProduct: Map<string, number>) {
    if (!scopedLocationId) return Number(product.stock_qty || 0);
    return Number(scopedStockByProduct.get(String(product.id)) || 0);
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
    if (normalizedUnits.filter((unit) => unit.isSaleUnit).length !== 1) throw new AppError('Choose exactly one default sale unit', 'INVALID_UNITS', 400);
    if (normalizedUnits.filter((unit) => unit.isPurchaseUnit).length !== 1) throw new AppError('Choose exactly one default purchase unit', 'INVALID_UNITS', 400);

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
        type: offer.type === 'price' ? 'price' : offer.type === 'fixed' ? 'fixed' : 'percent',
        value: Number(offer.value || 0),
        minQty: Math.max(1, Number(offer.minQty || 1)),
        from: offer.from || null,
        to: offer.to || null,
      }))
      .filter((offer) => offer.value > 0);

    const customerPrices = (payload.customerPrices || [])
      .map((entry) => ({ customerId: Number(entry.customerId || 0), price: Number(entry.price || 0) }))
      .filter((entry) => entry.customerId > 0);

    const fashionVariants: NormalizedFashionVariant[] = Array.from(new Map(
      (payload.fashionVariants || [])
        .map((entry) => ({
          color: normalizeArabicInput(entry.color),
          size: normalizeArabicInput(entry.size),
          barcode: String(entry.barcode || '').trim(),
          stock: Math.max(0, Number(entry.stock || 0)),
        }))
        .filter((entry) => entry.color || entry.size)
        .map((entry) => [`${normalizeArabicSearch(entry.color)}::${normalizeArabicSearch(entry.size)}`, entry]),
    ).values());

    return {
      name: normalizeArabicInput(payload.name),
      barcode: String(payload.barcode || '').trim(),
      itemKind: payload.itemKind === 'fashion' ? 'fashion' : 'standard',
      styleCode: String(payload.styleCode || '').trim(),
      color: normalizeArabicInput(payload.color),
      size: normalizeArabicInput(payload.size),
      categoryId: payload.categoryId ? Number(payload.categoryId) : null,
      supplierId: payload.supplierId ? Number(payload.supplierId) : null,
      costPrice: Number(payload.costPrice || 0),
      retailPrice: Number(payload.retailPrice || 0),
      wholesalePrice: Number(payload.wholesalePrice || 0),
      minStock: Number(payload.minStock || 0),
      notes: normalizeArabicInput(payload.notes),
      units: normalizedUnits,
      offers,
      customerPrices,
      fashionVariants,
      ...(payload.stock !== undefined && payload.stock !== null ? { stock: Number(payload.stock || 0) } : {}),
    };
  }

  private buildVariantLabel(variant: Pick<NormalizedFashionVariant, 'color' | 'size'>): string {
    const color = String(variant.color || '').trim();
    const size = String(variant.size || '').trim();
    if (color && size) return `${color} / ${size}`;
    return color || size;
  }

  private async ensureProductIdentityAvailable(payload: NormalizedUpsertProduct, productId?: number): Promise<void> {
    if (payload.name) {
      let query = this.db.selectFrom('products').select('id').where(sql`LOWER(name)`, '=', payload.name.toLowerCase()).where('is_active', '=', true);
      if (productId) query = query.where('id', '!=', productId);
      const existing = await query.executeTakeFirst();
      if (existing) throw new AppError('Product already exists', 'PRODUCT_EXISTS', 400);
    }

    if (payload.barcode) {
      let query = this.db.selectFrom('products').select('id').where(sql`LOWER(barcode)`, '=', payload.barcode.toLowerCase()).where('is_active', '=', true);
      if (productId) query = query.where('id', '!=', productId);
      const existing = await query.executeTakeFirst();
      if (existing) throw new AppError('Barcode already exists', 'BARCODE_EXISTS', 400);
    }
  }

  private async replaceProductRelations(db: ProductWriteExecutor, productId: number, payload: NormalizedUpsertProduct): Promise<void> {
    const offerCapabilities = await this.getProductOfferColumnCapabilities();
    this.ensureAdvancedOffersSupported(payload, offerCapabilities);

    await db.deleteFrom('product_units').where('product_id', '=', productId).execute();
    await db.deleteFrom('product_offers').where('product_id', '=', productId).execute();
    await db.deleteFrom('product_customer_prices').where('product_id', '=', productId).execute();

    for (const unit of payload.units) {
      await db.insertInto('product_units').values({
        product_id: productId,
        name: unit.name,
        multiplier: unit.multiplier,
        barcode: unit.barcode || null,
        is_base_unit: unit.isBaseUnit,
        is_sale_unit_default: unit.isSaleUnit,
        is_purchase_unit_default: unit.isPurchaseUnit,
      }).execute();
    }

    for (const offer of payload.offers) {
      if (offerCapabilities.hasMinQty) {
        await db.insertInto('product_offers').values({
          product_id: productId,
          offer_type: offer.type,
          value: offer.value,
          min_qty: offer.minQty,
          start_date: offer.from,
          end_date: offer.to,
          is_active: true,
        }).execute();
      } else {
        await db.insertInto('product_offers').values({
          product_id: productId,
          offer_type: offer.type === 'price' ? 'fixed' : offer.type,
          value: offer.value,
          start_date: offer.from,
          end_date: offer.to,
          is_active: true,
        }).execute();
      }
    }

    for (const price of payload.customerPrices) {
      await db.insertInto('product_customer_prices').values({ product_id: productId, customer_id: price.customerId, price: price.price }).execute();
    }
  }

  async createProduct(payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const normalized = this.normalizeProductPayload(payload);
    if (!normalized.name) throw new AppError('Product name is required', 'PRODUCT_NAME_REQUIRED', 400);
    this.ensureAdvancedOffersSupported(normalized, await this.getProductOfferColumnCapabilities());

    const shouldExpandVariants = normalized.fashionVariants.length > 0 && (normalized.itemKind === 'fashion' || Boolean(normalized.styleCode));
    const drafts = shouldExpandVariants
      ? normalized.fashionVariants.map((variant) => {
          const label = this.buildVariantLabel(variant);
          return {
            ...normalized,
            name: label ? `${normalized.name} - ${label}` : normalized.name,
            barcode: variant.barcode || '',
            color: variant.color,
            size: variant.size,
            stock: variant.stock,
            fashionVariants: [],
          };
        })
      : [normalized];

    const duplicateDraftNames = new Set<string>();
    const duplicateDraftBarcodes = new Set<string>();
    for (const draft of drafts) {
      const nameKey = draft.name.toLowerCase();
      if (duplicateDraftNames.has(nameKey)) throw new AppError('Duplicate grouped variants are not allowed', 'PRODUCT_EXISTS', 400);
      duplicateDraftNames.add(nameKey);
      if (draft.barcode) {
        const barcodeKey = draft.barcode.toLowerCase();
        if (duplicateDraftBarcodes.has(barcodeKey)) throw new AppError('Variant barcodes must be unique', 'BARCODE_EXISTS', 400);
        duplicateDraftBarcodes.add(barcodeKey);
      }
      await this.ensureProductIdentityAvailable(draft);
    }

    await this.db.transaction().execute(async (trx) => {
      for (const draft of drafts) {
        const initialStockQty = Number(draft.stock || 0);
        const result = await trx
          .insertInto('products')
          .values({
            name: draft.name,
            barcode: draft.barcode || null,
            item_kind: draft.itemKind,
            style_code: draft.styleCode || null,
            color: draft.color || null,
            size: draft.size || null,
            category_id: draft.categoryId,
            supplier_id: draft.supplierId,
            cost_price: draft.costPrice,
            retail_price: draft.retailPrice,
            wholesale_price: draft.wholesalePrice,
            stock_qty: initialStockQty,
            min_stock_qty: draft.minStock,
            notes: draft.notes,
            is_active: true,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        const productId = Number(result.id);
        await this.replaceProductRelations(trx, productId, draft);
        if (initialStockQty > 0) {
          await trx.insertInto('product_location_stock').values({ product_id: productId, branch_id: null, location_id: null, qty: initialStockQty }).execute();
        }
      }
    });

    const auditLabel = drafts.length > 1
      ? `تم إضافة مجموعة أصناف ${normalized.name} بعدد ${drafts.length} عناصر فرعية بواسطة ${actor.username}`
      : `تم إضافة الصنف ${normalized.name} بواسطة ${actor.username}`;
    await this.audit.log('إضافة صنف', auditLabel, actor.userId);
    return { ok: true, products: (await this.listProducts({}, actor)).products };
  }

  async updateProduct(id: number, payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db.selectFrom('products').selectAll().where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!existing) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    const normalized = this.normalizeProductPayload(payload);
    if (!normalized.name) throw new AppError('Product name is required', 'PRODUCT_NAME_REQUIRED', 400);
    await this.ensureProductIdentityAvailable(normalized, id);
    this.ensureAdvancedOffersSupported(normalized, await this.getProductOfferColumnCapabilities());

    const priceChanged = Number(normalized.costPrice || 0) !== Number(existing.cost_price || 0)
      || Number(normalized.retailPrice || 0) !== Number(existing.retail_price || 0)
      || Number(normalized.wholesalePrice || 0) !== Number(existing.wholesale_price || 0);
    if (priceChanged && !this.hasPermission(actor, 'canEditPrice')) {
      throw new AppError('Price changes require canEditPrice permission', 'PRICE_CHANGE_FORBIDDEN', 403);
    }
    if (normalized.stock !== undefined && normalized.stock !== null) {
      throw new AppError('Stock cannot be edited from product master data. Use inventory adjustment.', 'STOCK_UPDATE_FORBIDDEN', 400);
    }

    await this.db.transaction().execute(async (trx) => {
      await trx.updateTable('products').set({
        name: normalized.name,
        barcode: normalized.barcode || null,
        item_kind: normalized.itemKind,
        style_code: normalized.styleCode || null,
        color: normalized.color || null,
        size: normalized.size || null,
        category_id: normalized.categoryId,
        supplier_id: normalized.supplierId,
        cost_price: normalized.costPrice,
        retail_price: normalized.retailPrice,
        wholesale_price: normalized.wholesalePrice,
        min_stock_qty: normalized.minStock,
        notes: normalized.notes,
        updated_at: sql`NOW()`,
      }).where('id', '=', id).execute();
      await this.replaceProductRelations(trx, id, normalized);
    });

    await this.audit.log('تعديل صنف', `تم تحديث الصنف #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, products: (await this.listProducts({}, actor)).products };
  }

  async deleteProduct(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    await this.db.transaction().execute(async (trx) => {
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      if (Math.abs(Number(product.stock_qty || 0)) > 0.0001) throw new AppError('Product still has stock on hand', 'PRODUCT_HAS_STOCK', 400);
      const movementCount = await trx.selectFrom('stock_movements').select((eb) => eb.fn.countAll<number>().as('count')).where('product_id', '=', id).executeTakeFirstOrThrow();
      if (Number(movementCount.count || 0) > 0) throw new AppError('Product has transaction history and cannot be deleted', 'PRODUCT_HAS_HISTORY', 400);
      await trx.updateTable('products').set({ is_active: false, updated_at: sql`NOW()` }).where('id', '=', id).execute();
    });
    await this.audit.log('حذف صنف', `تم حذف الصنف #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, products: (await this.listProducts({}, actor)).products };
  }
}
