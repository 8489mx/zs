const fs = require('fs');

const data = JSON.parse(fs.readFileSync('c:\\zn\\zs-backup-2026-07-03-20-36-33.ragab.json', 'utf8'));

const products = data.tables.products || [];
const stock_movements = data.tables.stock_movements || [];

const nullLocProducts = products.filter(p => !p.default_location_id || p.default_location_id === 1 || p.default_location_id === '1');

const updates = [];

nullLocProducts.forEach(p => {
  const movements = stock_movements.filter(m => m.product_id === p.id);
  const locQty = {};
  movements.forEach(m => {
    locQty[m.location_id] = (locQty[m.location_id] || 0) + Number(m.qty);
  });
  
  let maxLoc = null;
  let maxQty = -Infinity;
  for (const [locId, qty] of Object.entries(locQty)) {
    // Only update to locations that are not 1
    if (locId !== '1' && qty > maxQty) {
      maxQty = qty;
      maxLoc = locId;
    }
  }
  
  if (maxLoc) {
    updates.push({ id: p.id, location_id: maxLoc });
  }
});

console.log(`Found ${updates.length} products to update based on movements.`);

const sql = updates.map(u => `UPDATE products SET default_location_id = ${u.location_id} WHERE id = ${u.id};`).join('\n');
fs.writeFileSync('c:\\zn\\backend\\apply_updates.sql', sql);
console.log('Saved to apply_updates.sql');
