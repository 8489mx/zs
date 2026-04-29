import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { ForbiddenException } from '@nestjs/common';
import { REQUIRED_PERMISSIONS_KEY } from '../../src/core/auth/decorators/permissions.decorator';
import { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';
import { PermissionsGuard } from '../../src/core/auth/guards/permissions.guard';
import { CatalogController } from '../../src/modules/catalog/catalog.controller';
import { CatalogProductService } from '../../src/modules/catalog/services/catalog-product.service';

type ProductRow = {
  id: number;
  name: string;
  barcode: string | null;
  item_kind: 'standard' | 'fashion';
  style_code: string | null;
  color: string | null;
  size: string | null;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  min_stock_qty: number;
  is_active: boolean;
};

type UnitRow = {
  id: number;
  product_id: number;
  name: string;
  multiplier: number;
  barcode: string | null;
  is_base_unit: boolean;
  is_sale_unit_default: boolean;
  is_purchase_unit_default: boolean;
};

const cashier: AuthContext = {
  userId: 10,
  sessionId: 'session-pos',
  username: 'cashier',
  role: 'cashier',
  permissions: ['sales'],
  tenantId: 'tenant-a',
  accountId: 'account-a',
};

class FakeSelectBuilder {
  private filters: Array<{ column: string; op: string; value: unknown }> = [];
  private hasExpressionFilter = false;
  private rowLimit = 1000;

  constructor(private readonly table: string, private readonly db: FakeDb) {}

  select(): this { return this; }
  leftJoin(): this { return this; }
  innerJoin(): this { return this; }
  orderBy(): this { return this; }

  where(columnOrExpression: unknown, op?: string, value?: unknown): this {
    if (typeof columnOrExpression === 'string') {
      this.filters.push({ column: columnOrExpression, op: String(op || ''), value });
    } else {
      this.hasExpressionFilter = true;
    }
    return this;
  }

  limit(value: number): this {
    this.rowLimit = value;
    if (this.table === 'products as p') this.db.lastProductQueryLimit = value;
    return this;
  }

  async execute(): Promise<Array<Record<string, unknown>>> {
    if (this.table === 'products as p') return this.executeProductLookup();
    if (this.table === 'product_units as pu') return this.executeUnitBarcodeLookup();
    if (this.table === 'product_units') return this.executeUnitList();
    if (this.table === 'product_location_stock as pls') return [];
    return [];
  }

  private executeProductLookup(): Array<Record<string, unknown>> {
    const barcodeFilter = this.filters.find((filter) => filter.column === 'p.barcode' && filter.op === '=');
    let rows = this.db.products.filter((product) => product.is_active);
    if (barcodeFilter) rows = rows.filter((product) => product.barcode === barcodeFilter.value);
    if (!barcodeFilter && this.hasExpressionFilter && this.db.searchNeedle) {
      const needle = this.db.searchNeedle.toLowerCase();
      rows = rows.filter((product) => {
        const unitHaystack = this.db.productUnits
          .filter((unit) => unit.product_id === product.id)
          .flatMap((unit) => [unit.name, unit.barcode || ''])
          .join(' ')
          .toLowerCase();
        const haystack = [
          product.name,
          product.barcode || '',
          product.style_code || '',
          unitHaystack,
        ].join(' ').toLowerCase();
        return haystack.includes(needle);
      });
    }
    return rows.slice(0, this.rowLimit).map(({ is_active: _isActive, ...product }) => product);
  }

  private executeUnitBarcodeLookup(): Array<Record<string, unknown>> {
    const barcodeFilter = this.filters.find((filter) => filter.column === 'pu.barcode' && filter.op === '=');
    const excludedIds = this.filters.find((filter) => filter.column === 'p.id' && filter.op === 'not in')?.value;
    const excluded = Array.isArray(excludedIds) ? excludedIds.map(Number) : [];
    const matchingUnits = this.db.productUnits
      .filter((unit) => !barcodeFilter || unit.barcode === barcodeFilter.value)
      .filter((unit) => !excluded.includes(Number(unit.product_id)))
      .slice(0, this.rowLimit);

    return matchingUnits.flatMap((unit) => {
      const product = this.db.products.find((entry) => entry.id === unit.product_id && entry.is_active);
      if (!product) return [];
      const { is_active: _isActive, ...productFields } = product;
      return [{
        ...productFields,
        matched_unit_id: unit.id,
        matched_unit_name: unit.name,
        matched_unit_multiplier: unit.multiplier,
        matched_unit_barcode: unit.barcode,
      }];
    });
  }

  private executeUnitList(): Array<Record<string, unknown>> {
    const ids = this.filters.find((filter) => filter.column === 'product_id' && filter.op === 'in')?.value;
    const productIds = Array.isArray(ids) ? ids.map(Number) : [];
    return this.db.productUnits.filter((unit) => productIds.includes(Number(unit.product_id))).slice(0, this.rowLimit);
  }
}

class FakeDb {
  products: ProductRow[] = [
    product(1, 'Milk', '111', 9),
    product(2, 'Coffee', '222', 22),
  ];
  productUnits: UnitRow[] = [
    unit(10, 1, 'piece', '111'),
    unit(20, 2, 'box', 'BOX222'),
  ];
  lastProductQueryLimit = 0;
  searchNeedle = '';

  selectFrom(table: string): FakeSelectBuilder {
    return new FakeSelectBuilder(table, this);
  }
}

function product(id: number, name: string, barcode: string, retailPrice: number): ProductRow {
  return {
    id,
    name,
    barcode,
    item_kind: 'standard',
    style_code: `SKU-${id}`,
    color: null,
    size: null,
    retail_price: retailPrice,
    wholesale_price: Math.max(1, retailPrice - 2),
    stock_qty: 12,
    min_stock_qty: 2,
    is_active: true,
  };
}

function unit(id: number, productId: number, name: string, barcode: string): UnitRow {
  return {
    id,
    product_id: productId,
    name,
    multiplier: name === 'box' ? 12 : 1,
    barcode,
    is_base_unit: name === 'piece',
    is_sale_unit_default: name === 'piece',
    is_purchase_unit_default: name === 'box',
  };
}

function createService(db = new FakeDb()): { db: FakeDb; service: CatalogProductService } {
  const service = new CatalogProductService(
    db as any,
    {} as any,
    { assertLocationScope: async (locationId: number) => ({ id: locationId, name: 'Main', branchId: 1 }) } as any,
  );
  return { db, service };
}

function productIds(result: Record<string, unknown>): string[] {
  return (result.products as Array<Record<string, unknown>>).map((entry) => String(entry.id));
}

async function run(): Promise<void> {
  {
    const { service } = createService();
    const result = await service.listPosProducts({ barcode: '111' }, cashier);
    assert.deepEqual(productIds(result), ['1']);
    assert.equal((result.products as Array<Record<string, unknown>>)[0].barcode, '111');
  }

  {
    const { service } = createService();
    const result = await service.listPosProducts({ barcode: 'BOX222' }, cashier);
    const [matched] = result.products as Array<Record<string, unknown>>;
    assert.equal(matched.id, '2');
    assert.deepEqual(matched.matchedUnit, { id: '20', name: 'box', multiplier: 12, barcode: 'BOX222' });
  }

  {
    const db = new FakeDb();
    db.products = [
      product(1, 'Fresh Milk', 'MILK-1', 9),
      product(2, 'Rice Bag', 'RICE-1', 7),
      product(3, 'Milk Powder', 'MILK-2', 11),
    ];
    db.searchNeedle = 'milk';
    const { service } = createService(db);
    const result = await service.listPosProducts({ q: 'milk', limit: 5 }, cashier);
    assert.deepEqual(productIds(result), ['1', '3']);
    assert.equal(db.lastProductQueryLimit, 5);
  }

  {
    const db = new FakeDb();
    db.products = Array.from({ length: 80 }, (_entry, index) => product(index + 1, `Product ${index + 1}`, `BC-${index + 1}`, index + 1));
    const { service } = createService(db);
    const result = await service.listPosProducts({ q: 'product', limit: 500 }, cashier);
    assert.equal((result.products as Array<Record<string, unknown>>).length, 50);
    assert.equal((result.meta as Record<string, unknown>).limit, 50);
    assert.equal(db.lastProductQueryLimit, 50);
  }

  {
    assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CatalogController.prototype.listPosProducts), ['sales']);
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => ['sales'] } as any,
      { hasAllPermissions: (granted: string[], required: string[]) => required.every((permission) => granted.includes(permission)) } as any,
    );
    assert.equal(guard.canActivate({ getHandler: () => null, getClass: () => CatalogController, switchToHttp: () => ({ getRequest: () => ({ authContext: cashier }) }) } as any), true);
    assert.throws(
      () => guard.canActivate({ getHandler: () => null, getClass: () => CatalogController, switchToHttp: () => ({ getRequest: () => ({ authContext: { ...cashier, permissions: [] } }) }) } as any),
      ForbiddenException,
    );
  }

  console.log('pos-product-lookup.spec: ok');
}

void run();
