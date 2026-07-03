const fs = require('fs');

const data = JSON.parse(fs.readFileSync('c:\\zn\\zs-backup-2026-07-03-20-36-33.ragab.json', 'utf8'));

const products = data.tables.products || [];
const stock_locations = data.tables.stock_locations || [];
// The table name for stock in the backup might be 'stock_movements' or something, wait:
// Let's check if there is a 'product_location_stock' or similar. 
// Ah, the backup might not dump 'product_location_stock' because it might be a view or computed, or it's named 'stock_movements'!
const stock_movements = data.tables.stock_movements || [];

const product = products.find(p => p.name.includes('جالون تتبيله كفته'));
console.log('Product:', product);

if (product) {
  const stock = stock_movements.filter(s => s.product_id === product.id);
  
  // Calculate stock per location
  const locStock = {};
  stock.forEach(s => {
    locStock[s.location_id] = (locStock[s.location_id] || 0) + Number(s.qty);
  });
  console.log('Stock for this product (from movements):', locStock);
}

const inactiveLocations = stock_locations.filter(l => !l.is_active).map(l => l.id);
console.log('Inactive locations:', inactiveLocations);

// Find products where default_location_id is null or in inactiveLocations
const missingLocationProducts = products.filter(p => !p.default_location_id || inactiveLocations.includes(p.default_location_id));
console.log('Number of products with missing/inactive default location:', missingLocationProducts.length);
if (missingLocationProducts.length > 0) {
  console.log('Sample of these products:', missingLocationProducts.slice(0, 3));
  
  const sampleId = missingLocationProducts[0].id;
  const sampleStock = stock_movements.filter(s => s.product_id === sampleId);
  const locStock = {};
  sampleStock.forEach(s => {
    locStock[s.location_id] = (locStock[s.location_id] || 0) + Number(s.qty);
  });
  console.log('Stock for sample product:', locStock);
}
