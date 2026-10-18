const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('frontend/src/locales/en.json', 'utf8'));

function flatten(obj, prefix = '') {
  let res = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(res, flatten(v, full));
    } else {
      res[full] = v;
    }
  }
  return res;
}

function unflatten(flat) {
  const result = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let cur = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return result;
}

const flatEn = flatten(en);

// 1. Inject from i18n-purchase-prototype.ts
const protoContent = fs.readFileSync('frontend/src/features/purchases/utils/i18n-purchase-prototype.ts', 'utf8');
const dictRegex = /([a-zA-Z0-9_]+):\s*\{\s*ar:\s*['"]([^'"]+)['"]\s*,\s*en:\s*['"]([^'"]+)['"]\s*\}/g;

let match;
let protoCount = 0;
while ((match = dictRegex.exec(protoContent)) !== null) {
  const key = match[1];
  const enVal = match[3];
  flatEn[key] = enVal;
  protoCount++;
}
console.log(`Injected ${protoCount} purchase prototype keys into flatEn.`);

// 2. Inject missing sidebar and returns keys
const extraKeys = {
  'common.exporting': 'Exporting...',
  'sidebar.maritime-customers': 'Maritime Customers',
  'sidebar.maritime-suppliers': 'Maritime Suppliers',
  'sidebar.van-reps': 'Van Sales Reps',
  'sidebar.van-fleet': 'Distribution Fleet',
  'sidebar.van-sales': 'Van Field Sales',
  'sidebar.van-returns': 'Van Field Returns',
  'sidebar.van-warehouses': 'Mobile Warehouses',
  'sidebar.van-issue': 'Loading Orders',
  'sidebar.expand_menu': 'Expand Menu',
  
  'returns.item_suspect': 'Suspicious Item',
  'returns.refund_amount': 'Refund Amount',
  'returns.col_time_gap': 'Time Gap',
  'returns.same_minute': 'Same Minute',
  'returns.col_flags': 'Audit Flags',
  'returns.copy_cctv_hint': 'Copy timestamp for CCTV review',
  'returns.copy_cctv': 'Copy CCTV Time',
  'returns.empty_suspects': 'No suspicious returns detected',
  'returns.col_cashier_employee': 'Cashier / Employee',

  'sales.f8413b': 'Invoices List',
  'sales.1b017b': 'Add Invoice',
  'sales.38df37': 'Total Invoices',
  'sales.c31e9c': 'Search Invoices...'
};

for (const [k, v] of Object.entries(extraKeys)) {
  flatEn[k] = v;
}

const newEn = unflatten(flatEn);
fs.writeFileSync('frontend/src/locales/en.json', JSON.stringify(newEn, null, 2), 'utf8');
console.log('Successfully saved complete en.json!');
