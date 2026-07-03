const fs = require('fs');

const data = JSON.parse(fs.readFileSync('c:\\zn\\zs-backup-2026-07-03-20-36-33.ragab.json', 'utf8'));

const products = data.tables.products || [];
const stock_locations = data.tables.stock_locations || [];
const stock_movements = data.tables.stock_movements || [];

const nullLocProducts = products.filter(p => !p.default_location_id);
console.log('Products with NULL default_location_id:', nullLocProducts.length);

if (nullLocProducts.length > 0) {
  const stockCounts = {};
  
  nullLocProducts.forEach(p => {
    const movements = stock_movements.filter(m => m.product_id === p.id);
    const locQty = {};
    movements.forEach(m => {
      locQty[m.location_id] = (locQty[m.location_id] || 0) + Number(m.qty);
    });
    
    // Find the location with the max stock
    let maxLoc = null;
    let maxQty = -Infinity;
    for (const [locId, qty] of Object.entries(locQty)) {
      if (qty > maxQty) {
        maxQty = qty;
        maxLoc = locId;
      }
    }
    
    if (maxLoc) {
      stockCounts[maxLoc] = (stockCounts[maxLoc] || 0) + 1;
    } else {
      stockCounts['NoStock'] = (stockCounts['NoStock'] || 0) + 1;
    }
  });
  
  console.log('Main stock location distribution for these products:');
  console.log(stockCounts);
  
  console.log('Mapping of location IDs:');
  stock_locations.forEach(sl => {
    console.log(`${sl.id}: ${sl.name}`);
  });
}
