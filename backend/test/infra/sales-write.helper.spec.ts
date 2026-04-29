import assert from 'node:assert/strict';
import { AppError } from '../../src/common/errors/app-error';
import { applyStockDelta } from '../../src/common/utils/location-stock-ledger';
import { buildPreparedSaleItem, calculateAllowedSaleUnitPrice, calculateCollectibleTotal, calculatePaidAmount, calculateRestoredStockQuantity, resolvePostedSalePaymentChannel, resolveSalePayments } from '../../src/modules/sales/helpers/sales-write.helper';

type FakeProduct = { id: number; name: string; stock_qty: number };
type FakeLocationStock = { id: number; product_id: number; branch_id: number | null; location_id: number | null; qty: number };
type FakeStockState = { products: FakeProduct[]; locationStock: FakeLocationStock[]; nextLocationStockId: number };

class FakeSelectBuilder {
  private filters = new Map<string, unknown>();
  constructor(private readonly table: string, private readonly state: FakeStockState) {}
  select(_columns: unknown): this { return this; }
  where(column: string, _operator: string, value: unknown): this {
    this.filters.set(column, value);
    return this;
  }
  forUpdate(): this { return this; }
  async executeTakeFirst(): Promise<unknown> {
    const rows = await this.execute();
    return rows[0];
  }
  async execute(): Promise<unknown[]> {
    if (this.table === 'products') return this.state.products.filter((row) => row.id === Number(this.filters.get('id') || 0));
    if (this.table === 'product_location_stock') return this.state.locationStock.filter((row) => row.product_id === Number(this.filters.get('product_id') || 0));
    throw new Error(`Unexpected select table ${this.table}`);
  }
}

class FakeInsertBuilder {
  private payload: Record<string, unknown> = {};
  constructor(private readonly table: string, private readonly state: FakeStockState) {}
  values(payload: Record<string, unknown>): this {
    this.payload = payload;
    return this;
  }
  returning(_columns: unknown): this { return this; }
  async executeTakeFirstOrThrow(): Promise<unknown> {
    if (this.table !== 'product_location_stock') throw new Error(`Unexpected insert table ${this.table}`);
    const row: FakeLocationStock = {
      id: this.state.nextLocationStockId,
      product_id: Number(this.payload.product_id),
      branch_id: this.payload.branch_id == null ? null : Number(this.payload.branch_id),
      location_id: this.payload.location_id == null ? null : Number(this.payload.location_id),
      qty: Number(this.payload.qty || 0),
    };
    this.state.nextLocationStockId += 1;
    this.state.locationStock.push(row);
    return row;
  }
}

class FakeUpdateBuilder {
  private payload: Record<string, unknown> = {};
  private filters = new Map<string, unknown>();
  constructor(private readonly table: string, private readonly state: FakeStockState) {}
  set(payload: Record<string, unknown>): this {
    this.payload = payload;
    return this;
  }
  where(column: string, _operator: string, value: unknown): this {
    this.filters.set(column, value);
    return this;
  }
  async execute(): Promise<void> {
    if (this.table === 'products') {
      const row = this.state.products.find((product) => product.id === Number(this.filters.get('id') || 0));
      if (row && this.payload.stock_qty !== undefined) row.stock_qty = Number(this.payload.stock_qty);
      return;
    }
    if (this.table === 'product_location_stock') {
      const row = this.state.locationStock.find((entry) => entry.id === Number(this.filters.get('id') || 0));
      if (row && this.payload.qty !== undefined) row.qty = Number(this.payload.qty);
      if (row && this.payload.branch_id !== undefined) row.branch_id = this.payload.branch_id == null ? null : Number(this.payload.branch_id);
      return;
    }
    throw new Error(`Unexpected update table ${this.table}`);
  }
}

class FakeStockDb {
  constructor(private readonly state: FakeStockState) {}
  selectFrom(table: string): FakeSelectBuilder { return new FakeSelectBuilder(table, this.state); }
  insertInto(table: string): FakeInsertBuilder { return new FakeInsertBuilder(table, this.state); }
  updateTable(table: string): FakeUpdateBuilder { return new FakeUpdateBuilder(table, this.state); }
}

function createFakeStockDb(stockQty: number, locationQty?: number): { db: FakeStockDb; state: FakeStockState } {
  const state: FakeStockState = {
    products: [{ id: 7, name: 'Beans', stock_qty: stockQty }],
    locationStock: locationQty === undefined ? [] : [{ id: 1, product_id: 7, branch_id: 3, location_id: 4, qty: locationQty }],
    nextLocationStockId: locationQty === undefined ? 1 : 2,
  };
  return { db: new FakeStockDb(state), state };
}

const prepared = buildPreparedSaleItem(
  { id: 2, name: 'Tea', stock_qty: '10', cost_price: '3.5' },
  { productId: 2, qty: 2, price: 5, unitName: 'علبة', unitMultiplier: 1.5, priceType: 'retail' },
);
assert.deepEqual(prepared, {
  productId: 2,
  productName: 'Tea',
  qty: 2,
  unitPrice: 5,
  lineTotal: 10,
  unitName: 'علبة',
  unitMultiplier: 1.5,
  priceType: 'retail',
  costPrice: 5.25,
  requiredQty: 3,
  beforeQty: 10,
  afterQty: 7,
});


assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail' }), 100);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'wholesale' }), 80);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: '2026-01-01', end_date: '2026-12-31' }], todayIso: '2026-04-14' }), 90);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'fixed', value: 15, start_date: '2026-01-01', end_date: '2026-12-31' }], todayIso: '2026-04-14' }), 85);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'price', value: 72, start_date: '2026-01-01', end_date: '2026-12-31' }], todayIso: '2026-04-14' }), 72);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: '2026-04-14', end_date: null }], todayIso: '2026-04-14' }), 90);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: null, end_date: '2026-04-14' }], todayIso: '2026-04-14' }), 90);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: '2026-04-15', end_date: null }], todayIso: '2026-04-14' }), 100);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: null, end_date: '2026-04-13' }], todayIso: '2026-04-14' }), 100);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 25, min_qty: 3, start_date: '2026-04-14', end_date: '2026-04-14' }], qty: 2, todayIso: '2026-04-14' }), 100);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 25, min_qty: 3, start_date: '2026-04-14', end_date: '2026-04-14' }], qty: 3, todayIso: '2026-04-14' }), 75);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: '2026-04-14T23:30:00.000Z', end_date: '2026-04-14T01:30:00.000Z' }], todayIso: '2026-04-14' }), 90);

assert.equal(calculateCollectibleTotal(120, 20), 100);
assert.deepEqual(resolveSalePayments('credit', [{ paymentChannel: 'cash', amount: 10 }], 100), []);
assert.deepEqual(resolveSalePayments('cash', [], 55), [{ paymentChannel: 'cash', amount: 55 }]);
assert.equal(calculatePaidAmount([{ amount: 10 }, { amount: 5.255 }]), 15.26);
assert.equal(resolvePostedSalePaymentChannel('credit', []), 'credit');
assert.equal(resolvePostedSalePaymentChannel('cash', [{ paymentChannel: 'card' }]), 'card');
assert.equal(resolvePostedSalePaymentChannel('cash', [{ paymentChannel: 'cash' }, { paymentChannel: 'card' }]), 'mixed');
assert.deepEqual(calculateRestoredStockQuantity('4', '2', '1.5'), { restoreQty: 3, beforeQty: 4, afterQty: 7 });

assert.throws(
  () => buildPreparedSaleItem({ id: 3, name: 'Sugar', stock_qty: '1', cost_price: '2' }, { productId: 3, qty: 2, price: 5, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' }),
  (error: unknown) => error instanceof AppError && error.code === 'INSUFFICIENT_STOCK',
);

assert.deepEqual(
  buildPreparedSaleItem(
    { id: 3, name: 'Sugar', stock_qty: '1', cost_price: '2' },
    { productId: 3, qty: 2, price: 5, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' },
    { allowNegativeStockSales: true },
  ),
  {
    productId: 3,
    productName: 'Sugar',
    qty: 2,
    unitPrice: 5,
    lineTotal: 10,
    unitName: 'قطعة',
    unitMultiplier: 1,
    priceType: 'retail',
    costPrice: 2,
    requiredQty: 2,
    beforeQty: 1,
    afterQty: -1,
  },
);

async function runStockDeltaChecks(): Promise<void> {
  assert.equal(
    buildPreparedSaleItem(
      { id: 3, name: 'Sugar', stock_qty: '0', cost_price: '2' },
      { productId: 3, qty: 1, price: 5, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' },
      { allowNegativeStockSales: true },
    ).afterQty,
    -1,
  );

  const { db, state } = createFakeStockDb(0);
  const stockChange = await applyStockDelta(db as never, {
    productId: 7,
    delta: -1,
    allowNegative: true,
  });
  assert.deepEqual(stockChange, { globalBefore: 0, globalAfter: -1, scopeBefore: 0, scopeAfter: -1 });
  assert.equal(state.products[0].stock_qty, -1);
  assert.equal(state.locationStock[0].qty, -1);

  const exceedStock = createFakeStockDb(1, 1);
  const exceedStockChange = await applyStockDelta(exceedStock.db as never, {
    productId: 7,
    delta: -2,
    branchId: 3,
    locationId: 4,
    allowNegative: true,
  });
  assert.deepEqual(exceedStockChange, { globalBefore: 1, globalAfter: -1, scopeBefore: 1, scopeAfter: -1 });
  assert.equal(exceedStock.state.products[0].stock_qty, -1);
  assert.equal(exceedStock.state.locationStock.find((row) => row.location_id === 4)?.qty, -1);

  const blocked = createFakeStockDb(1, 1);
  await assert.rejects(
    () => applyStockDelta(blocked.db as never, {
      productId: 7,
      delta: -2,
      branchId: 3,
      locationId: 4,
      allowNegative: false,
    }),
    (error: unknown) => error instanceof AppError && error.code === 'INSUFFICIENT_STOCK',
  );
  assert.equal(blocked.state.products[0].stock_qty, 1);
  assert.equal(blocked.state.locationStock.find((row) => row.location_id === 4)?.qty, 1);
}

runStockDeltaChecks()
  .then(() => console.log('sales write helper checks passed'))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
