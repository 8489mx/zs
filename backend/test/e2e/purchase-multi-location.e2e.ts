import assert from 'node:assert/strict';
import { E2EClient, ensureRunning, expectArray, uniqueSuffix } from './e2e-utils';

async function main() {
  process.env.E2E_USERNAME = 'dev';
  process.env.E2E_PASSWORD = '1';

  await ensureRunning(process.env.E2E_BASE_URL || 'http://127.0.0.1:3101');
  const client = new E2EClient(process.env.E2E_BASE_URL || 'http://127.0.0.1:3101');
  await client.login(process.env.E2E_USERNAME, process.env.E2E_PASSWORD);

  const suffix = uniqueSuffix('multi-loc');
  const supplierName = `E2E Supplier ${suffix}`;
  const productName1 = `E2E Prod1 ${suffix}`;
  const productName2 = `E2E Prod2 ${suffix}`;

  // 1. Get branches
  const branches = expectArray(await client.get('/api/branches'), 'branches');
  const branchId = branches[0]?.id;
  assert.ok(branchId, 'Must have at least one branch');

  // 2. Create two locations
  const loc1 = await client.post('/api/locations', { name: `Loc 1 ${suffix}`, type: 'warehouse', branchId }, 201);
  const loc2 = await client.post('/api/locations', { name: `Loc 2 ${suffix}`, type: 'warehouse', branchId }, 201);
  const loc1Id = loc1.id;
  const loc2Id = loc2.id;
  assert.ok(loc1Id, 'loc1Id is missing');
  assert.ok(loc2Id, 'loc2Id is missing');

  // 3. Create a supplier
  const supplier = await client.post('/api/suppliers', {
    name: supplierName,
    phone: '',
    address: '',
    balance: 0,
    notes: 'Multi loc supplier',
  }, 201);
  const supplierId = supplier.id;

  // 4. Create two products (no default category or location)
  const product1 = await client.post('/api/products', { name: productName1, type: 'standard', sellPrice: 100, costPrice: 50 }, 201);
  const product2 = await client.post('/api/products', { name: productName2, type: 'standard', sellPrice: 100, costPrice: 50 }, 201);
  const p1Id = product1.id;
  const p2Id = product2.id;

  // 5. Create a Purchase Order with lines in different locations
  const purchasePayload = {
    supplierId,
    paymentType: 'credit',
    discount: 0,
    note: 'Multi location test',
    taxRate: 0,
    pricesIncludeTax: false,
    branchId: null,
    locationId: null, // NO HEADER LOCATION
    items: [
      {
        productId: p1Id,
        qty: 10,
        cost: 50,
        unitName: 'Piece',
        unitMultiplier: 1,
        locationId: loc1Id // Line 1 targets Loc 1
      },
      {
        productId: p2Id,
        qty: 20,
        cost: 50,
        unitName: 'Piece',
        unitMultiplier: 1,
        locationId: loc2Id // Line 2 targets Loc 2
      }
    ]
  };

  const purchaseRes = await client.post('/api/purchases', purchasePayload, 201);
  const purchaseId = purchaseRes.id;
  assert.ok(purchaseId, 'Purchase was not created');

  // 6. Receive the purchase order
  await client.post(`/api/purchases/${purchaseId}/receive`, { note: 'Received' }, 201);

  // 7. Verify stock
  const stock1 = expectArray(await client.get(`/api/inventory/stock?productId=${p1Id}`), 'stock1');
  const stock2 = expectArray(await client.get(`/api/inventory/stock?productId=${p2Id}`), 'stock2');

  const stock1Loc1 = stock1.find((s: any) => s.locationId === loc1Id);
  const stock1Loc2 = stock1.find((s: any) => s.locationId === loc2Id);

  assert.equal(stock1Loc1?.qty, 10, 'Product 1 stock in Loc 1 must be 10');
  assert.ok(!stock1Loc2 || stock1Loc2.qty === 0, 'Product 1 stock in Loc 2 must be 0 or undefined');

  const stock2Loc1 = stock2.find((s: any) => s.locationId === loc1Id);
  const stock2Loc2 = stock2.find((s: any) => s.locationId === loc2Id);

  assert.equal(stock2Loc2?.qty, 20, 'Product 2 stock in Loc 2 must be 20');
  assert.ok(!stock2Loc1 || stock2Loc1.qty === 0, 'Product 2 stock in Loc 1 must be 0 or undefined');

  console.log('purchase-multi-location.e2e: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
