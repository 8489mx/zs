const http = require('http');

const payload = JSON.stringify({
  name: "رامه لاب 4GB DDR4",
  barcode: "",
  itemType: "product",
  itemKind: "standard",
  styleCode: "",
  color: "",
  size: "",
  costPrice: 500,
  retailPrice: 1000,
  wholesalePrice: 650,
  stock: 1,
  minStock: 0,
  categoryId: "1",
  supplierId: "1",
  notes: "",
  units: [
    {
      name: "قطعة",
      multiplier: 1,
      barcode: "",
      isBaseUnit: true,
      isSaleUnit: true,
      isPurchaseUnit: true
    }
  ],
  customerPrices: [],
  fashionVariants: []
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    // Bypass auth using test user or we might get 401. Let's just see if we get a 400 validation error first.
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', data));
});

req.on('error', e => console.error(e));
req.write(payload);
req.end();
