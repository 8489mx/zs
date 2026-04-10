import assert from 'node:assert/strict';
import { expectArray, findByName, loginClient, uniqueSuffix } from './e2e-utils';

async function main() {
  const client = await loginClient();
  const suffix = uniqueSuffix('catalog');
  const categoryName = `E2E Category ${suffix}`;
  const supplierName = `E2E Supplier ${suffix}`;
  const productName = `E2E Product ${suffix}`;

  await client.post('/api/categories', { name: categoryName }, 201);
  const categoriesPayload = await client.get('/api/categories');
  const categories = expectArray(categoriesPayload.categories, 'categories');
  const category = findByName(categories, categoryName);

  await client.post('/api/suppliers', {
    name: supplierName,
    phone: '',
    address: '',
    balance: 0,
    notes: 'E2E supplier',
  }, 201);
  const suppliersPayload = await client.get('/api/suppliers');
  const suppliers = expectArray(suppliersPayload.suppliers, 'suppliers');
  const supplier = findByName(suppliers, supplierName);

  await client.post('/api/products', {
    name: productName,
    barcode: `${Date.now()}`,
    categoryId: Number(category.id),
    supplierId: Number(supplier.id),
    costPrice: 10,
    retailPrice: 15,
    wholesalePrice: 12,
    minStock: 2,
    notes: 'E2E product',
    stock: 0,
    units: [
      {
        name: 'قطعة',
        multiplier: 1,
        barcode: '',
        isBaseUnit: true,
        isSaleUnit: true,
        isPurchaseUnit: true,
      },
    ],
  }, 201);

  const productsPayload = await client.get(`/api/products?q=${encodeURIComponent(productName)}`);
  const products = expectArray(productsPayload.products, 'products');
  const product = findByName(products, productName);
  assert.equal(Number(product.costPrice), 10);
  assert.equal(Number(product.retailPrice), 15);

  console.log('catalog-master-data.e2e: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
