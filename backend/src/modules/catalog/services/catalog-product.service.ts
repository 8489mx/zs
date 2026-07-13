import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { NormalizedFashionVariant, NormalizedProductOffer, NormalizedUpsertProduct, UpsertProductDto } from '../dto/upsert-product.dto';
import { InventoryScopeService } from '../../inventory/services/inventory-scope.service';
import { normalizeArabicInput, normalizeArabicSearch } from '../../../common/utils/arabic-search.util';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

type ProductRow = {
  id: number;
  name: string;
  barcode: string | null;
  item_type?: 'product' | 'raw_material';
  item_kind: 'standard' | 'fashion' | null;
  style_code: string | null;
  color: string | null;
  size: string | null;
  bin_location: string | null;
  category_id: number | null;
  supplier_id: number | null;
  cost_price: string | number;
  retail_price: string | number;
  wholesale_price: string | number;
  stock_qty: string | number;
  min_stock_qty: string | number;
  bom_id?: number | null;
  default_location_id?: number | null;
  default_location_name?: string | null;
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

type PosProductLookupRow = Pick<ProductRow, 'id' | 'name' | 'barcode' | 'item_type' | 'item_kind' | 'style_code' | 'color' | 'size' | 'retail_price' | 'wholesale_price' | 'stock_qty' | 'min_stock_qty' | 'bom_id' | 'category_id'> & {
  matched_unit_id?: number | null;
  matched_unit_name?: string | null;
  matched_unit_multiplier?: string | number | null;
  matched_unit_barcode?: string | null;
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

  private scope(actor: AuthContext) {
    return requireTenantScope(actor);
  }

  private hasPermission(actor: AuthContext, permission: string): boolean {
    return actor.role === 'super_admin' || Boolean(actor.permissions?.includes(permission));
  }

  private tenantId(actor: AuthContext): string {
    return this.scope(actor).tenantId;
  }

  private accountId(actor: AuthContext): string {
    return this.scope(actor).accountId;
  }

  private tenantFields(actor: AuthContext) {
    return { tenant_id: this.tenantId(actor), account_id: this.accountId(actor) };
  }

  private tenantPredicate(actor: AuthContext, alias?: string) {
    const tenantId = this.tenantId(actor);
    return alias
      ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}`
      : sql<boolean>`tenant_id = ${tenantId}`;
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

  async getNextStyleCode(actor: AuthContext): Promise<{ styleCode: string }> {
    const result = await this.db
      .selectFrom('products')
      .select(['style_code'])
      .where('style_code', 'is not', null)
      .where(this.tenantPredicate(actor))
      .execute();
      
    let maxNumeric = 100;
    for (const row of result) {
      if (!row.style_code) continue;
      const parsed = parseInt(row.style_code.trim(), 10);
      if (!isNaN(parsed) && parsed.toString() === row.style_code.trim()) {
        if (parsed > maxNumeric) {
          maxNumeric = parsed;
        }
      }
    }
    
    return { styleCode: (maxNumeric + 1).toString() };
  }

  async allocateStyleCode(actor: AuthContext): Promise<{ styleCode: string }> {
    return this.db.transaction().execute(async (trx) => {
      const { tenantId } = requireTenantScope(actor);
      let counter = await trx
        .selectFrom('style_code_counters')
        .select('next_value')
        .where('tenant_id', '=', tenantId)
        .where('scope', '=', 'fashion')
        .forUpdate()
        .executeTakeFirst();

      if (!counter) {
        const maxResult = await trx
          .selectFrom('products')
          .select(['style_code'])
          .where('style_code', 'is not', null)
          .where(this.tenantPredicate(actor))
          .execute();
          
        let maxNumeric = 100;
        for (const row of maxResult) {
          if (!row.style_code) continue;
          const parsed = parseInt(row.style_code.trim(), 10);
          if (!isNaN(parsed) && parsed.toString() === row.style_code.trim()) {
            if (parsed > maxNumeric) {
              maxNumeric = parsed;
            }
          }
        }
        
        const seedValue = maxNumeric + 1;
        await trx
          .insertInto('style_code_counters')
          .values({
            tenant_id: tenantId,
            scope: 'fashion',
            next_value: seedValue
          })
          .onConflict((oc) => oc.columns(['tenant_id', 'scope']).doNothing())
          .execute();
          
        counter = await trx
          .selectFrom('style_code_counters')
          .select('next_value')
          .where('tenant_id', '=', tenantId)
          .where('scope', '=', 'fashion')
          .forUpdate()
          .executeTakeFirst();
      }

      const allocated = counter!.next_value;
      
      await trx
        .updateTable('style_code_counters')
        .set({ next_value: allocated + 1 })
        .where('tenant_id', '=', tenantId)
        .where('scope', '=', 'fashion')
        .execute();
        
      return { styleCode: allocated.toString() };
    });
  }

  async listProducts(query: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> {
    const { page, pageSize, q, view, requestedLocationId } = this.parseListProductsQuery(query);
    const canViewCost = this.hasPermission(actor, 'canViewCost');
    const offerCapabilities = await this.getProductOfferColumnCapabilities();
    const scopedLocation = requestedLocationId > 0 && actor ? await this.inventoryScope.assertLocationScope(requestedLocationId, actor) : null;

    const [products, categories, suppliers] = await Promise.all([
      this.db
        .selectFrom('products')
        .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'products.id').on('b.is_active', '=', true))
        .leftJoin('stock_locations as sl', (join) => join.onRef('sl.id', '=', 'products.default_location_id').on(this.tenantPredicate(actor, 'sl')))
        .select(['products.id', 'products.name', 'products.barcode', 'products.item_type', 'products.item_kind', 'products.style_code', 'products.color', 'products.size', 'products.bin_location', 'products.category_id', 'products.supplier_id', 'products.cost_price', 'products.retail_price', 'products.wholesale_price', 'products.stock_qty', 'products.min_stock_qty', 'sl.id as default_location_id', 'products.notes', 'b.id as bom_id', 'sl.name as default_location_name'])
        .where('products.is_active', '=', true)
        .where(this.tenantPredicate(actor, 'products'))
        .orderBy('id', 'desc')
        .execute() as Promise<ProductRow[]>,
      this.db.selectFrom('product_categories').select(['id', 'name']).where('is_active', '=', true).where(this.tenantPredicate(actor)).execute(),
      this.db.selectFrom('suppliers').select(['id', 'name']).where('is_active', '=', true).where(this.tenantPredicate(actor)).execute(),
    ]);

    const productIds = products.map((product) => Number(product.id));
    const scopedStockResult = await this.resolveScopedStockByProduct(productIds, scopedLocation?.id || null, products, actor);
    const listContext = await this.buildListProductsContext(productIds, q, categories, suppliers, actor);
    const filteredBaseRows = this.filterListProducts(products, { q, view, scopedLocationId: scopedLocation?.id || null, scopedStockByProduct: scopedStockResult.stock, ...listContext });

    const total = filteredBaseRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pagedBaseRows = filteredBaseRows.slice(start, start + pageSize);
    const pagedIds = pagedBaseRows.map((row) => Number(row.id));

    const relations = await this.fetchListProductRelations(pagedIds, offerCapabilities.hasMinQty, actor);
    const pagedRows = this.mapListProducts(pagedBaseRows, {
      canViewCost,
      scopedLocationId: scopedLocation?.id || null,
      scopedStockByProduct: scopedStockResult.stock,
      activeLocationsByProduct: scopedStockResult.locations,
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
        scopedStockByProduct: scopedStockResult.stock,
        offerCountByProduct: listContext.offerCountByProduct,
        customerPriceCountByProduct: listContext.customerPriceCountByProduct,
      }),
    };
  }

  private parseListProductsQuery(query: Record<string, unknown>) {
    return {
      page: Math.max(1, Number(query.page || 1)),
      pageSize: Math.min(10000, Math.max(5, Number(query.pageSize || 20))),
      q: normalizeArabicSearch(query.q),
      view: String(query.view || 'all'),
      requestedLocationId: Number(query.locationId || 0),
    };
  }

  async listPosProducts(query: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> {
    const { q, barcode, limit, requestedLocationId, view } = this.parsePosProductLookupQuery(query);
    const offerCapabilities = await this.getProductOfferColumnCapabilities();
    const scopedLocation = requestedLocationId > 0 ? await this.inventoryScope.assertLocationScope(requestedLocationId, actor) : null;
    const productRows = barcode
      ? await this.findPosProductsByBarcode(barcode, limit, actor)
      : await this.searchPosProducts(q, limit, view === 'offers' ? 'offers' : 'all', actor);

    const uniqueRows = this.uniquePosProductRows(productRows).slice(0, limit);
    const productIds = uniqueRows.map((product) => Number(product.id));
    const [unitsByProduct, scopedStockResult, offersByProduct] = await Promise.all([
      this.fetchPosProductUnits(productIds, actor),
      this.resolveScopedStockByProduct(productIds, scopedLocation?.id || null, uniqueRows, actor),
      this.fetchProductOffers(productIds, offerCapabilities.hasMinQty, actor),
    ]);

    return {
      products: uniqueRows.map((product) => this.mapPosProduct(product, {
        scopedLocationId: scopedLocation?.id || null,
        scopedStockByProduct: scopedStockResult.stock,
        unitsByProduct,
        offersByProduct,
      })),
      meta: {
        q,
        barcode,
        limit,
        view,
        locationId: scopedLocation?.id ? String(scopedLocation.id) : '',
      },
    };
  }

  private parsePosProductLookupQuery(query: Record<string, unknown>) {
    const requestedLimit = Number(query.limit || 30);
    const safeLimit = Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 30;
    const view = String(query.view || '').trim() === 'offers' ? 'offers' : 'all';
    const maxLimit = view === 'offers' ? 240 : 50;
    return {
      q: String(query.q || '').trim(),
      barcode: String(query.barcode || '').trim(),
      limit: Math.min(maxLimit, Math.max(1, safeLimit)),
      requestedLocationId: Number(query.locationId || 0),
      view,
    };
  }

  private async findPosProductsByBarcode(barcode: string, limit: number, actor: AuthContext): Promise<PosProductLookupRow[]> {
    if (!barcode) return [];
    const productMatches = await this.db
      .selectFrom('products as p')
      .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
      .select(['p.id', 'p.name', 'p.barcode', 'p.item_type', 'p.item_kind', 'p.style_code', 'p.color', 'p.size', 'p.retail_price', 'p.wholesale_price', 'p.stock_qty', 'p.min_stock_qty', 'b.id as bom_id', 'p.category_id'])
      .where('p.is_active', '=', true)
      .where('p.barcode', '=', barcode)
      .where(this.tenantPredicate(actor, 'p'))
      .orderBy('p.id', 'asc')
      .limit(limit)
      .execute() as PosProductLookupRow[];

    const seenProductIds = productMatches.map((product) => Number(product.id));
    const remaining = limit - productMatches.length;
    if (remaining <= 0) return productMatches;

    let unitQuery = this.db
      .selectFrom('product_units as pu')
      .innerJoin('products as p', 'p.id', 'pu.product_id')
      .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        'p.item_type',
        'p.item_kind',
        'p.style_code',
        'p.color',
        'p.size',
        'p.retail_price',
        'p.wholesale_price',
        'p.stock_qty',
        'p.min_stock_qty',
        'b.id as bom_id',
        'p.category_id',
        'pu.id as matched_unit_id',
        'pu.name as matched_unit_name',
        'pu.multiplier as matched_unit_multiplier',
        'pu.barcode as matched_unit_barcode',
      ])
      .where('p.is_active', '=', true)
      .where('pu.barcode', '=', barcode)
      .where(this.tenantPredicate(actor, 'p'));

    if (seenProductIds.length) unitQuery = unitQuery.where('p.id', 'not in', seenProductIds);

    const unitMatches = await unitQuery
      .orderBy('p.id', 'asc')
      .limit(remaining)
      .execute() as PosProductLookupRow[];

    return [...productMatches, ...unitMatches];
  }

  private async searchPosProducts(q: string, limit: number, view: 'all' | 'offers' = 'all', actor: AuthContext): Promise<PosProductLookupRow[]> {
    const normalized = q.trim().toLowerCase();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    let productQuery = this.db
      .selectFrom('products as p')
      .leftJoin('product_units as pu', 'pu.product_id', 'p.id')
      .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        'p.item_type',
        'p.item_kind',
        'p.style_code',
        'p.color',
        'p.size',
        'p.retail_price',
        'p.wholesale_price',
        'p.stock_qty',
        'p.min_stock_qty',
        'b.id as bom_id',
        'p.category_id',
      ])
      .where('p.is_active', '=', true)
      .where(this.tenantPredicate(actor, 'p'));

    for (const token of tokens) {
      const pattern = `%${token}%`;
      productQuery = productQuery.where(sql<boolean>`(
        LOWER(p.name) LIKE ${pattern}
        OR LOWER(COALESCE(p.barcode, '')) LIKE ${pattern}
        OR LOWER(COALESCE(p.style_code, '')) LIKE ${pattern}
        OR LOWER(COALESCE(p.color, '')) LIKE ${pattern}
        OR LOWER(COALESCE(p.size, '')) LIKE ${pattern}
        OR LOWER(COALESCE(pu.barcode, '')) LIKE ${pattern}
        OR LOWER(COALESCE(pu.name, '')) LIKE ${pattern}
      )`);
    }

    if (view === 'offers') {
      productQuery = productQuery.where(sql<boolean>`exists (
        select 1
        from product_offers po
        where po.product_id = p.id
          and po.is_active = true
          and po.tenant_id = ${this.tenantId(actor)}
      )`);
    }

    return productQuery
      .orderBy('p.name', 'asc')
      .orderBy('p.id', 'asc')
      .limit(limit)
      .execute() as Promise<PosProductLookupRow[]>;
  }

  private uniquePosProductRows(rows: PosProductLookupRow[]): PosProductLookupRow[] {
    const seen = new Set<number>();
    const uniqueRows: PosProductLookupRow[] = [];
    for (const row of rows) {
      const id = Number(row.id);
      if (seen.has(id)) continue;
      seen.add(id);
      uniqueRows.push(row);
    }
    return uniqueRows;
  }

  private async fetchPosProductUnits(productIds: number[], actor: AuthContext): Promise<Map<string, Record<string, unknown>[]>> {
    if (!productIds.length) return new Map();
    const unitRows = await this.db
      .selectFrom('product_units')
      .select(['id', 'product_id', 'name', 'multiplier', 'barcode', 'is_base_unit', 'is_sale_unit_default', 'is_purchase_unit_default'])
      .where('product_id', 'in', productIds)
      .where(this.tenantPredicate(actor))
      .orderBy('product_id', 'asc')
      .orderBy('is_base_unit', 'desc')
      .orderBy('id', 'asc')
      .execute() as ProductUnitReadRow[];

    const unitsByProduct = new Map<string, Record<string, unknown>[]>();
    for (const unit of unitRows) {
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
    return unitsByProduct;
  }

  private async fetchProductOffers(productIds: number[], hasMinQty: boolean, actor: AuthContext): Promise<Map<string, Record<string, unknown>[]>> {
    if (!productIds.length) return new Map();
    const offers = hasMinQty
      ? await this.db
          .selectFrom('product_offers')
          .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date', 'min_qty'])
          .where('is_active', '=', true)
          .where('product_id', 'in', productIds)
          .where(this.tenantPredicate(actor))
          .orderBy('id', 'desc')
          .execute() as ProductOfferReadRow[]
      : await this.db
          .selectFrom('product_offers')
          .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date'])
          .where('is_active', '=', true)
          .where('product_id', 'in', productIds)
          .where(this.tenantPredicate(actor))
          .orderBy('id', 'desc')
          .execute() as ProductOfferReadRow[];

    return this.mapOffersByProduct(offers);
  }

  private mapOffersByProduct(offers: ProductOfferReadRow[]): Map<string, Record<string, unknown>[]> {
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
    return offersByProduct;
  }

  private mapPosProduct(
    product: PosProductLookupRow,
    context: {
      scopedLocationId: number | null;
      scopedStockByProduct: Map<string, number>;
      unitsByProduct: Map<string, Record<string, unknown>[]>;
      offersByProduct: Map<string, Record<string, unknown>[]>;
    },
  ): Record<string, unknown> {
    const units = context.unitsByProduct.get(String(product.id)) || [
      {
        id: `base-${product.id}`,
        name: 'piece',
        multiplier: 1,
        barcode: product.barcode || '',
        isBaseUnit: true,
        isSaleUnit: true,
        isPurchaseUnit: true,
      },
    ];

    return {
      id: String(product.id),
      name: product.name || '',
      barcode: product.barcode || '',
      itemType: product.item_type === 'raw_material' ? 'raw_material' : 'product',
      itemKind: product.item_kind === 'fashion' ? 'fashion' : 'standard',
      styleCode: product.style_code || '',
      color: product.color || '',
      size: product.size || '',
      retailPrice: Number(product.retail_price || 0),
      wholesalePrice: Number(product.wholesale_price || 0),
      categoryId: product.category_id ? String(product.category_id) : undefined,
      stock: this.getListProductStock(product, context.scopedLocationId, context.scopedStockByProduct),
      globalStock: Number(product.stock_qty || 0),
      minStock: Number(product.min_stock_qty || 0),
      locationId: context.scopedLocationId ? String(context.scopedLocationId) : '',
      matchedUnitId: product.matched_unit_id ? String(product.matched_unit_id) : '',
      matchedUnit: product.matched_unit_id
        ? {
            id: String(product.matched_unit_id),
            name: product.matched_unit_name || '',
            multiplier: Number(product.matched_unit_multiplier || 1),
            barcode: product.matched_unit_barcode || '',
        }
        : null,
      bomId: product.bom_id ? Number(product.bom_id) : undefined,
      hasBom: !!product.bom_id,
      units,
      offers: context.offersByProduct.get(String(product.id)) || [],
    };
  }

  private async resolveScopedStockByProduct(productIds: number[], scopedLocationId: number | null, products: Array<Pick<ProductRow, 'id' | 'stock_qty'>>, actor: AuthContext): Promise<{ stock: Map<string, number>, locations: Map<string, number[]> }> {
    const scopedStockByProduct = new Map<string, number>();
    const activeLocationsByProduct = new Map<string, number[]>();
    if (!productIds.length) return { stock: scopedStockByProduct, locations: activeLocationsByProduct };

    const stockRows = await this.db
      .selectFrom('product_location_stock as pls')
      .select(['pls.product_id', 'pls.location_id', 'pls.qty'])
      .where('pls.product_id', 'in', productIds)
      .where(this.tenantPredicate(actor, 'pls'))
      .execute();

    const locationQtyByProduct = new Map<string, number>();
    const unassignedQtyByProduct = new Map<string, number>();
    for (const row of stockRows) {
      const key = String(row.product_id);
      const qty = Number(row.qty || 0);
      
      if (!activeLocationsByProduct.has(key)) activeLocationsByProduct.set(key, []);
      if (row.location_id) activeLocationsByProduct.get(key)!.push(row.location_id);

      if (row.location_id == null) unassignedQtyByProduct.set(key, qty);
      if (scopedLocationId && Number(row.location_id || 0) === scopedLocationId) locationQtyByProduct.set(key, qty);
    }

    for (const product of products) {
      const key = String(product.id);
      if (scopedLocationId) {
        const allLocationRowsForProduct = stockRows.filter(r => String(r.product_id) === key && r.location_id != null);
        const currentSum = allLocationRowsForProduct.reduce((sum, r) => sum + Number(r.qty || 0), 0);
        const discrepancy = Number(product.stock_qty || 0) - currentSum;
        const locationQty = locationQtyByProduct.get(key) || 0;
        const unassignedQty = unassignedQtyByProduct.get(key) || 0;
        let available = locationQty + unassignedQty;
        if (discrepancy > 0.001 && unassignedQty === 0) {
           available += discrepancy;
        }
        scopedStockByProduct.set(key, Number(available.toFixed(3)));
      } else {
        scopedStockByProduct.set(key, Number(product.stock_qty || 0));
      }
    }

    return { stock: scopedStockByProduct, locations: activeLocationsByProduct };
  }

  private async buildListProductsContext(
    productIds: number[],
    q: string,
    categories: Array<{ id: number; name: string }>,
    suppliers: Array<{ id: number; name: string }>,
    actor: AuthContext,
  ) {
    const [unitSearchRows, offerCountRows, customerPriceCountRows] = await Promise.all([
      q && productIds.length
        ? this.db
            .selectFrom('product_units')
            .select(['product_id', 'name', 'barcode'])
            .where('product_id', 'in', productIds)
            .where(this.tenantPredicate(actor))
            .orderBy('product_id', 'asc')
            .execute() as Promise<ProductUnitSearchRow[]>
        : Promise.resolve([]),
      productIds.length
        ? this.db
            .selectFrom('product_offers')
            .select(['product_id', (eb) => eb.fn.countAll<number>().as('count')])
            .where('is_active', '=', true)
            .where('product_id', 'in', productIds)
            .where(this.tenantPredicate(actor))
            .groupBy('product_id')
            .execute() as Promise<ProductCountRow[]>
        : Promise.resolve([]),
      productIds.length
        ? this.db
            .selectFrom('product_customer_prices')
            .select(['product_id', (eb) => eb.fn.countAll<number>().as('count')])
            .where('product_id', 'in', productIds)
            .where(this.tenantPredicate(actor))
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

  private async fetchListProductRelations(pagedIds: number[], hasMinQty: boolean, actor: AuthContext) {
    const [units, offers, customerPrices] = pagedIds.length
      ? await Promise.all([
          this.db
            .selectFrom('product_units')
            .select(['id', 'product_id', 'name', 'multiplier', 'barcode', 'is_base_unit', 'is_sale_unit_default', 'is_purchase_unit_default'])
            .where('product_id', 'in', pagedIds)
            .where(this.tenantPredicate(actor))
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
                .where(this.tenantPredicate(actor))
                .orderBy('id', 'desc')
                .execute() as Promise<ProductOfferReadRow[]>
            : this.db
                .selectFrom('product_offers')
                .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date'])
                .where('is_active', '=', true)
                .where('product_id', 'in', pagedIds)
                .where(this.tenantPredicate(actor))
                .orderBy('id', 'desc')
                .execute() as Promise<ProductOfferReadRow[]>,
          this.db
            .selectFrom('product_customer_prices')
            .select(['id', 'product_id', 'customer_id', 'price'])
            .where('product_id', 'in', pagedIds)
            .where(this.tenantPredicate(actor))
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

    const offersByProduct = this.mapOffersByProduct(offers);

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
      activeLocationsByProduct?: Map<string, number[]>;
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
        itemType: product.item_type === 'raw_material' ? 'raw_material' : 'product',
        itemKind: product.item_kind === 'fashion' ? 'fashion' : 'standard',
        styleCode: product.style_code || '',
        color: product.color || '',
        size: product.size || '',
        binLocation: product.bin_location || '',
        costPrice: Number(product.cost_price || 0),
        retailPrice: Number(product.retail_price || 0),
        wholesalePrice: Number(product.wholesale_price || 0),
        stock: this.getListProductStock(product, context.scopedLocationId, context.scopedStockByProduct),
        minStock: Number(product.min_stock_qty || 0),
        notes: product.notes || '',
        bomId: product.bom_id ? Number(product.bom_id) : undefined,
        hasBom: !!product.bom_id,
        defaultLocationId: product.default_location_id ? String(product.default_location_id) : undefined,
        defaultLocationName: product.default_location_name || undefined,
        activeLocationIds: context.activeLocationsByProduct?.get(String(product.id))?.map(String) || [],
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

  private getListProductStock(product: Pick<ProductRow, 'id' | 'stock_qty'>, scopedLocationId: number | null, scopedStockByProduct: Map<string, number>) {
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
      itemType: payload.itemType === 'raw_material' ? 'raw_material' : 'product',
      itemKind: payload.itemKind === 'fashion' ? 'fashion' : 'standard',
      styleCode: String(payload.styleCode || '').trim(),
      color: normalizeArabicInput(payload.color),
      size: normalizeArabicInput(payload.size),
      binLocation: String(payload.binLocation || '').trim(),
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
      stock: payload.stock != null ? Number(payload.stock) : undefined,
      warehouseId: payload.warehouseId ? Number(payload.warehouseId) : undefined,
    };
  }

  private buildVariantLabel(variant: Pick<NormalizedFashionVariant, 'color' | 'size'>): string {
    const color = String(variant.color || '').trim();
    const size = String(variant.size || '').trim();
    if (color && size) return `${color} / ${size}`;
    return color || size;
  }

  private normalizeArabicDigits(value: string): string {
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    return String(value || '').replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
  }

  private coerceNewStyleCode(rawValue: string): string {
    const trimmed = String(rawValue || '').trim();
    if (!trimmed) return '';
    const normalized = this.normalizeArabicDigits(trimmed);
    if (!/^\d+$/.test(normalized)) {
      throw new AppError('كود المجموعة / الصنف الرئيسي يجب أن يكون أرقامًا فقط', 'STYLE_CODE_INVALID', 400);
    }
    return normalized;
  }

  private async ensureStyleCodeAvailable(
    styleCode: string | null | undefined,
    itemKind: 'standard' | 'fashion' | null | undefined,
    actor: AuthContext,
    excludeProductIds: number[] = [],
    drafts: Pick<NormalizedUpsertProduct, 'color' | 'size'>[] = [],
  ): Promise<void> {
    const normalized = String(styleCode || '').trim();
    if (!normalized) return;
    
    let query = this.db
      .selectFrom('products')
      .select(['id', 'item_kind', 'color', 'size'])
      .where('is_active', '=', true)
      .where('style_code', '=', normalized)
      .where(this.tenantPredicate(actor));

    if (excludeProductIds.length) {
      query = query.where('id', 'not in', excludeProductIds);
    }
    const existingRows = await query.execute();
    if (existingRows.length === 0) return;

    if (itemKind !== 'fashion') {
      throw new AppError('هذا الكود مستخدم بالفعل في صنف سابق', 'STYLE_CODE_EXISTS', 400);
    }

    const hasNonFashion = existingRows.some(row => row.item_kind !== 'fashion');
    if (hasNonFashion) {
      throw new AppError('هذا الكود مستخدم بالفعل في صنف غير ملابس', 'STYLE_CODE_EXISTS', 400);
    }

    for (const row of existingRows) {
      const normExistingColor = String(row.color || '').trim().toLowerCase();
      const normExistingSize = String(row.size || '').trim().toLowerCase();
      
      for (const draft of drafts) {
        const normDraftColor = String(draft.color || '').trim().toLowerCase();
        const normDraftSize = String(draft.size || '').trim().toLowerCase();
        if (normExistingColor === normDraftColor && normExistingSize === normDraftSize) {
          throw new AppError('هذا اللون والمقاس موجودان بالفعل لهذا الموديل', 'VARIANT_EXISTS', 400);
        }
      }
    }
  }

  private async ensureProductIdentityAvailable(payload: NormalizedUpsertProduct, actor: AuthContext, productId?: number): Promise<void> {
    if (payload.name) {
      let query = this.db.selectFrom('products').select('id').where(sql`LOWER(name)`, '=', payload.name.toLowerCase()).where('is_active', '=', true).where(this.tenantPredicate(actor));
      if (productId) query = query.where('id', '!=', productId);
      const existing = await query.executeTakeFirst();
      if (existing) throw new AppError('Product already exists', 'PRODUCT_EXISTS', 400);
    }

    if (payload.barcode) {
      let query = this.db.selectFrom('products').select('id').where(sql`LOWER(barcode)`, '=', payload.barcode.toLowerCase()).where('is_active', '=', true).where(this.tenantPredicate(actor));
      if (productId) query = query.where('id', '!=', productId);
      const existing = await query.executeTakeFirst();
      if (existing) throw new AppError('Barcode already exists', 'BARCODE_EXISTS', 400);
    }
  }

  private async ensureCategoryAndSupplierInTenant(payload: NormalizedUpsertProduct, actor: AuthContext): Promise<void> {
    if (payload.categoryId) {
      const category = await this.db
        .selectFrom('product_categories')
        .select('id')
        .where('id', '=', payload.categoryId)
        .where('is_active', '=', true)
        .where(this.tenantPredicate(actor))
        .executeTakeFirst();
      if (!category) throw new AppError('Category not found', 'CATEGORY_NOT_FOUND', 404);
    }

    if (payload.supplierId) {
      const supplier = await this.db
        .selectFrom('suppliers')
        .select('id')
        .where('id', '=', payload.supplierId)
        .where('is_active', '=', true)
        .where(this.tenantPredicate(actor))
        .executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }
  }

  private async ensureCustomerPricesInTenant(payload: NormalizedUpsertProduct, actor: AuthContext): Promise<void> {
    if (!payload.customerPrices.length) return;
    const uniqueCustomerIds = [...new Set(payload.customerPrices.map((entry) => Number(entry.customerId || 0)).filter((id) => id > 0))];
    const duplicateCustomerIds = uniqueCustomerIds.length !== payload.customerPrices.length;
    if (duplicateCustomerIds) {
      throw new AppError('Customer price duplicates are not allowed', 'CUSTOMER_PRICE_DUPLICATE', 400);
    }

    const rows = await this.db
      .selectFrom('customers')
      .select(['id'])
      .where('id', 'in', uniqueCustomerIds)
      .where('is_active', '=', true)
      .where(this.tenantPredicate(actor))
      .execute();

    if (rows.length !== uniqueCustomerIds.length) {
      throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }
  }

  private async replaceProductRelations(db: ProductWriteExecutor, productId: number, payload: NormalizedUpsertProduct, actor: AuthContext): Promise<void> {
    const offerCapabilities = await this.getProductOfferColumnCapabilities();
    this.ensureAdvancedOffersSupported(payload, offerCapabilities);

    await db.deleteFrom('product_units').where('product_id', '=', productId).where(this.tenantPredicate(actor)).execute();
    await db.deleteFrom('product_offers').where('product_id', '=', productId).where(this.tenantPredicate(actor)).execute();
    await db.deleteFrom('product_customer_prices').where('product_id', '=', productId).where(this.tenantPredicate(actor)).execute();

    for (const unit of payload.units) {
      await db.insertInto('product_units').values({
        product_id: productId,
        name: unit.name,
        multiplier: unit.multiplier,
        barcode: unit.barcode || null,
        is_base_unit: unit.isBaseUnit,
        is_sale_unit_default: unit.isSaleUnit,
        is_purchase_unit_default: unit.isPurchaseUnit,
        ...this.tenantFields(actor),
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
          ...this.tenantFields(actor),
        }).execute();
      } else {
        await db.insertInto('product_offers').values({
          product_id: productId,
          offer_type: offer.type === 'price' ? 'fixed' : offer.type,
          value: offer.value,
          start_date: offer.from,
          end_date: offer.to,
          is_active: true,
          ...this.tenantFields(actor),
        }).execute();
      }
    }

    for (const price of payload.customerPrices) {
      await db.insertInto('product_customer_prices').values({ product_id: productId, customer_id: price.customerId, price: price.price, ...this.tenantFields(actor) }).execute();
    }
  }

  async createProduct(payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const normalized = this.normalizeProductPayload(payload);
    if (!normalized.name) throw new AppError('Product name is required', 'PRODUCT_NAME_REQUIRED', 400);
    normalized.styleCode = this.coerceNewStyleCode(normalized.styleCode);
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

    await this.ensureStyleCodeAvailable(normalized.styleCode, normalized.itemKind, actor, [], drafts);
    this.ensureAdvancedOffersSupported(normalized, await this.getProductOfferColumnCapabilities());
    await this.ensureCategoryAndSupplierInTenant(normalized, actor);
    await this.ensureCustomerPricesInTenant(normalized, actor);

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
      await this.ensureProductIdentityAvailable(draft, actor);
    }

    let resolvedLocationId = normalized.warehouseId || null;
    const hasAnyInitialStock = drafts.some(d => Number(d.stock || 0) > 0);
    if (hasAnyInitialStock && !resolvedLocationId) {
      const settingsRaw = await this.db.selectFrom('settings').selectAll().where(this.tenantPredicate(actor)).execute();
      const settings = settingsRaw.reduce<Record<string, unknown>>((acc, row) => { try { acc[row.key] = JSON.parse(row.value); } catch { acc[row.key] = row.value; } return acc; }, {});
      if (settings.currentLocationId) {
        resolvedLocationId = Number(settings.currentLocationId);
      } else {
        const activeLocs = await this.db.selectFrom('stock_locations').select('id').where('is_active', '=', true).where((eb) => eb.or([eb('location_type', 'is', null), eb('location_type', '!=', 'in_transit')])).where(this.tenantPredicate(actor)).execute();
        if (activeLocs.length === 1) {
          resolvedLocationId = activeLocs[0].id;
        } else if (activeLocs.length > 1) {
          throw new AppError('يجب تحديد مكان استلام عند إضافة رصيد افتتاحي، وتوجد عدة أماكن متاحة.', 'LOCATION_REQUIRED', 400);
        }
      }
    }

    await this.db.transaction().execute(async (trx) => {
      for (const draft of drafts) {
        const initialStockQty = Number(draft.stock || 0);
        const result = await trx
          .insertInto('products')
          .values({
            name: draft.name,
            barcode: draft.barcode || null,
            item_type: draft.itemType || 'product',
            item_kind: draft.itemKind,
            style_code: draft.styleCode || null,
            color: draft.color || null,
            size: draft.size || null,
            bin_location: draft.binLocation || null,
            category_id: draft.categoryId,
            supplier_id: draft.supplierId,
            cost_price: draft.costPrice,
            retail_price: draft.retailPrice,
            wholesale_price: draft.wholesalePrice,
            stock_qty: initialStockQty,
            min_stock_qty: draft.minStock,
            default_location_id: resolvedLocationId,
            notes: draft.notes,
            is_active: true,
            ...this.tenantFields(actor),
          } as any)
          .returning('id')
          .executeTakeFirstOrThrow();
        const productId = Number(result.id);
        await this.replaceProductRelations(trx, productId, draft, actor);
        if (initialStockQty > 0) {
          await trx.insertInto('product_location_stock').values({ product_id: productId, branch_id: null, location_id: resolvedLocationId, qty: initialStockQty, ...this.tenantFields(actor) }).execute();
        }
      }
    });

    const auditLabel = drafts.length > 1
      ? `تم إضافة مجموعة أصناف ${normalized.name} بعدد ${drafts.length} عناصر فرعية بواسطة ${actor.username}`
      : `تم إضافة الصنف ${normalized.name} بواسطة ${actor.username}`;
    await this.audit.log('إضافة صنف', auditLabel, actor);
    return { ok: true, products: (await this.listProducts({}, actor)).products };
  }

  async updateProduct(id: number, payload: UpsertProductDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db.selectFrom('products').selectAll().where('id', '=', id).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
    if (!existing) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    const normalized = this.normalizeProductPayload(payload);
    if (!normalized.name) throw new AppError('Product name is required', 'PRODUCT_NAME_REQUIRED', 400);

    const existingStyleCode = String(existing.style_code || '').trim();
    const requestedStyleCode = String(normalized.styleCode || '').trim();
    const styleCodeChanged = requestedStyleCode !== existingStyleCode;
    if (styleCodeChanged) {
      normalized.styleCode = this.coerceNewStyleCode(requestedStyleCode);
    } else {
      normalized.styleCode = existingStyleCode;
    }

    await this.ensureStyleCodeAvailable(normalized.styleCode, normalized.itemKind, actor, [id], [normalized]);

    await this.ensureProductIdentityAvailable(normalized, actor, id);
    this.ensureAdvancedOffersSupported(normalized, await this.getProductOfferColumnCapabilities());
    await this.ensureCategoryAndSupplierInTenant(normalized, actor);
    await this.ensureCustomerPricesInTenant(normalized, actor);

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
        item_type: normalized.itemType || 'product',
        item_kind: normalized.itemKind,
        style_code: normalized.styleCode || null,
        color: normalized.color || null,
        size: normalized.size || null,
        bin_location: normalized.binLocation || null,
        category_id: normalized.categoryId,
        supplier_id: normalized.supplierId,
        cost_price: normalized.costPrice,
        retail_price: normalized.retailPrice,
        wholesale_price: normalized.wholesalePrice,
        min_stock_qty: normalized.minStock,
        default_location_id: normalized.warehouseId || null,
        notes: normalized.notes,
        updated_at: sql`NOW()`,
      }).where('id', '=', id).where(this.tenantPredicate(actor)).execute();
      await this.replaceProductRelations(trx, id, normalized, actor);
    });

    await this.audit.log('تعديل صنف', `تم تحديث الصنف #${id} بواسطة ${actor.username}`, actor);
    return { ok: true, products: (await this.listProducts({}, actor)).products };
  }

  async deleteProduct(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    await this.db.transaction().execute(async (trx) => {
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', id).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      if (Math.abs(Number(product.stock_qty || 0)) > 0.0001) throw new AppError('Product still has stock on hand', 'PRODUCT_HAS_STOCK', 400);
      const movementCount = await trx.selectFrom('stock_movements').select((eb) => eb.fn.countAll<number>().as('count')).where('product_id', '=', id).where(this.tenantPredicate(actor)).executeTakeFirstOrThrow();
      if (Number(movementCount.count || 0) > 0) throw new AppError('Product has transaction history and cannot be deleted', 'PRODUCT_HAS_HISTORY', 400);
      await trx.updateTable('products').set({ is_active: false, updated_at: sql`NOW()` }).where('id', '=', id).where(this.tenantPredicate(actor)).execute();
    });
    await this.audit.log('حذف صنف', `تم حذف الصنف #${id} بواسطة ${actor.username}`, actor);
    return { ok: true, products: (await this.listProducts({}, actor)).products };
  }

  async getProduct(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const canViewCost = this.hasPermission(actor, 'canViewCost');
    const offerCapabilities = await this.getProductOfferColumnCapabilities();

    const product = await this.db
      .selectFrom('products')
      .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'products.id').on('b.is_active', '=', true))
      .leftJoin('stock_locations as sl', (join) => join.onRef('sl.id', '=', 'products.default_location_id').on(this.tenantPredicate(actor, 'sl')))
      .select(['products.id', 'products.name', 'products.barcode', 'products.item_type', 'products.item_kind', 'products.style_code', 'products.color', 'products.size', 'products.bin_location', 'products.category_id', 'products.supplier_id', 'products.cost_price', 'products.retail_price', 'products.wholesale_price', 'products.stock_qty', 'products.min_stock_qty', 'sl.id as default_location_id', 'products.notes', 'b.id as bom_id', 'sl.name as default_location_name'])
      .where('products.id', '=', id)
      .where('products.is_active', '=', true)
      .where(this.tenantPredicate(actor, 'products'))
      .executeTakeFirst();

    if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);

    const productIds = [Number(product.id)];
    const relations = await this.fetchListProductRelations(productIds, offerCapabilities.hasMinQty, actor);
    const scopedStockResult = await this.resolveScopedStockByProduct(productIds, null, [product], actor);

    const mapped = this.mapListProducts([product], {
      canViewCost,
      scopedLocationId: null,
      scopedStockByProduct: scopedStockResult.stock,
      activeLocationsByProduct: scopedStockResult.locations,
      unitsByProduct: relations.unitsByProduct,
      offersByProduct: relations.offersByProduct,
      pricesByProduct: relations.pricesByProduct,
    });

    return mapped[0];
  }
}

