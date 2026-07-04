const fs = require('fs');
const file = 'C:\\zn\\frontend\\src\\features\\purchases\\pages\\NewPurchaseOrderPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexProduct = /(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-product">[\s\S]*?<\/td>\s*)/;
const regexCategory = /(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-category">[\s\S]*?<\/td>\s*)/;
const regexQty = /(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-qty">[\s\S]*?<\/td>\s*)/;
const regexPrice = /(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-price">[\s\S]*?<\/td>\s*)/;
const regexWarehouse = /(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-warehouse">[\s\S]*?<\/td>\s*)/;

const matchProduct = content.match(regexProduct)[0];
const matchCategory = content.match(regexCategory)[0];
const matchQty = content.match(regexQty)[0];
const matchPrice = content.match(regexPrice)[0];
const matchWarehouse = content.match(regexWarehouse)[0];

const oldBlock = matchProduct + matchCategory + matchQty + matchPrice + matchWarehouse;
const newBlock = matchProduct + matchWarehouse + matchQty + matchPrice + matchCategory;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, content);
console.log('done');
