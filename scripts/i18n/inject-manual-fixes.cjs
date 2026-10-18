const fs = require('fs');

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

const manualFixes = {
  'common.check_connection': 'Check system connection and try again.',
  'returns.cctv_check': 'CCTV Camera Check',
  'returns.cctv_return_date': 'Return Date',
  'returns.cctv_time_gap': 'Time Gap',
  'returns.print_radar_report': 'Print Audit Report',
  'returns.radar_search_placeholder': 'Search by document no., invoice, product or cashier...',
  'returns.subview_suspects': 'Transactions Audit Log',
  'returns.subview_cashiers': 'Cashier Risk Ratings',
  'returns.filter_cashier_placeholder': 'Filter by cashier name',
  'returns.all_movements': 'All Movements',
  'returns.high_suspect': 'High Suspicion',
  'returns.rapid_returns': 'Rapid Returns',
  'returns.medium_suspect': 'Audit & Follow-up',
  'returns.row_click_hint': 'Click to view return details',
  'returns.radar_filter_all': 'All Movements',
  'returns.radar_filter_high': 'High Suspicion',
  'returns.radar_filter_rapid': 'Rapid Returns',
  'returns.radar_filter_medium': 'Audit & Follow-up',
  'returns.col_doc_no': 'Document',
  'returns.col_product': 'Product',
  'returns.col_branch': 'Branch',
  'returns.col_cashier': 'Cashier',
  'returns.col_amount': 'Amount',
  'returns.col_date': 'Date',
  'returns.col_actions': 'Actions',
  'returns.tabs.register': 'Returns Register',
  'returns.tabs.radar': 'Audit & Anomaly Radar',
  'returns.register_desc': 'Track and process customer returns against sales invoices with full audit trails.',
  'returns.radar_desc': 'Intelligent monitoring for rapid returns, unusual cashier activity, and policy breaches.',
  'returns.summary.total_returns': 'Total Returns',
  'returns.summary.total_amount': 'Total Amount',
  'returns.summary.approved_returns': 'Approved',
  'returns.summary.rejected_returns': 'Rejected'
};

for (const [k, v] of Object.entries(manualFixes)) {
  flatEn[k] = v;
}

const newEn = unflatten(flatEn);
fs.writeFileSync('frontend/src/locales/en.json', JSON.stringify(newEn, null, 2), 'utf8');
console.log('Successfully injected manual semantic keys into en.json.');
