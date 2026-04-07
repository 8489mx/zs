type SaleRow = Record<string, unknown>;

type SaleListSummary = {
  totalItems: number;
  totalSales: number;
  todaySalesCount: number;
  todaySalesTotal: number;
  cashTotal: number;
  creditTotal: number;
  cancelledCount: number;
  topCustomers: Array<{ name: string; total: number; count: number }>;
};

export function mapSaleRows(
  sales: Array<Record<string, unknown>>,
  items: Array<Record<string, unknown>>,
  payments: Array<Record<string, unknown>>,
): SaleRow[] {
  const itemsBySale = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items) {
    const key = String(item.sale_id);
    if (!itemsBySale.has(key)) itemsBySale.set(key, []);
    itemsBySale.get(key)!.push({
      id: String(item.id),
      productId: item.product_id ? String(item.product_id) : '',
      name: item.product_name || '',
      qty: Number(item.qty || 0),
      price: Number(item.unit_price || 0),
      total: Number(item.line_total || 0),
      unitName: item.unit_name || 'قطعة',
      unitMultiplier: Number(item.unit_multiplier || 1),
      cost: Number(item.cost_price || 0),
      priceType: item.price_type || 'retail',
    });
  }

  const paymentsBySale = new Map<string, Array<Record<string, unknown>>>();
  for (const payment of payments) {
    const key = String(payment.sale_id);
    if (!paymentsBySale.has(key)) paymentsBySale.set(key, []);
    paymentsBySale.get(key)!.push({
      id: String(payment.id),
      paymentChannel: payment.payment_channel || 'cash',
      amount: Number(payment.amount || 0),
    });
  }

  return sales.map((sale) => ({
    id: String(sale.id),
    docNo: sale.doc_no || `S-${sale.id}`,
    customerId: sale.customer_id ? String(sale.customer_id) : '',
    customerName: sale.customer_name_ref || sale.customer_name || 'عميل نقدي',
    paymentType: sale.payment_type || 'cash',
    paymentChannel: sale.payment_channel || 'cash',
    subTotal: Number(sale.subtotal || 0),
    discount: Number(sale.discount || 0),
    taxRate: Number(sale.tax_rate || 0),
    taxAmount: Number(sale.tax_amount || 0),
    pricesIncludeTax: Boolean(sale.prices_include_tax),
    total: Number(sale.total || 0),
    paidAmount: Number(sale.paid_amount || 0),
    storeCreditUsed: Number(sale.store_credit_used || 0),
    status: sale.status || 'posted',
    note: sale.note || '',
    createdBy: sale.created_by_name || '',
    date: sale.created_at,
    branchId: sale.branch_id ? String(sale.branch_id) : '',
    locationId: sale.location_id ? String(sale.location_id) : '',
    branchName: sale.branch_name || '',
    locationName: sale.location_name || '',
    items: itemsBySale.get(String(sale.id)) || [],
    payments: paymentsBySale.get(String(sale.id)) || [],
  }));
}

export function filterSales(rows: SaleRow[], query: Record<string, unknown>): SaleRow[] {
  const q = String(query.search || query.q || '').toLowerCase();
  const filter = String(query.filter || query.view || 'all');
  return rows.filter((row) => {
    if (filter === 'cash' && row.paymentType !== 'cash') return false;
    if (filter === 'credit' && row.paymentType !== 'credit') return false;
    if (filter === 'cancelled' && row.status !== 'cancelled') return false;
    if (!q) return true;
    return [row.docNo, row.customerName, row.note, row.status].some((x) => String(x || '').toLowerCase().includes(q));
  });
}

export function paginateRows(rows: SaleRow[], query: Record<string, unknown>, defaultSize = 30) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || defaultSize)));
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pagination: { page: safePage, pageSize, totalItems, totalPages },
  };
}

export function summarizeSales(rows: SaleRow[]): SaleListSummary {
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter((row) => String(row.date || '').slice(0, 10) === today);
  const topCustomersMap = new Map<string, { name: string; total: number; count: number }>();
  for (const row of rows) {
    const key = String(row.customerId || row.customerName || 'cash');
    const current = topCustomersMap.get(key) || { name: String(row.customerName || 'عميل نقدي'), total: 0, count: 0 };
    current.total += Number(row.total || 0);
    current.count += 1;
    topCustomersMap.set(key, current);
  }

  return {
    totalItems: rows.length,
    totalSales: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    todaySalesCount: todayRows.length,
    todaySalesTotal: Number(todayRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cashTotal: Number(rows.filter((row) => row.paymentType === 'cash').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    creditTotal: Number(rows.filter((row) => row.paymentType === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cancelledCount: rows.filter((row) => row.status === 'cancelled').length,
    topCustomers: [...topCustomersMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

export function mapHeldSalesRows(
  rows: Array<Record<string, unknown>>,
  items: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const itemsByDraft = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items) {
    const key = String(item.held_sale_id);
    if (!itemsByDraft.has(key)) itemsByDraft.set(key, []);
    itemsByDraft.get(key)!.push({
      productId: item.product_id ? String(item.product_id) : '',
      name: item.product_name || '',
      qty: Number(item.qty || 0),
      price: Number(item.unit_price || 0),
      unitName: item.unit_name || 'قطعة',
      unitMultiplier: Number(item.unit_multiplier || 1),
      priceType: item.price_type || 'retail',
      lineKey: `${item.product_id || ''}::${item.unit_name || 'قطعة'}::${item.price_type || 'retail'}`,
    });
  }

  return rows.map((row) => ({
    id: String(row.id),
    savedAt: row.created_at,
    customerId: row.customer_id ? String(row.customer_id) : '',
    customerName: row.customer_name || '',
    paymentType: row.payment_type === 'credit' ? 'credit' : 'cash',
    paymentChannel: row.payment_type === 'credit' ? 'credit' : (row.payment_channel || 'cash'),
    paidAmount: Number(row.paid_amount || 0),
    cashAmount: Number(row.cash_amount || 0),
    cardAmount: Number(row.card_amount || 0),
    discount: Number(row.discount || 0),
    note: row.note || '',
    search: row.search || '',
    priceType: row.price_type || 'retail',
    branchId: row.branch_id ? String(row.branch_id) : '',
    locationId: row.location_id ? String(row.location_id) : '',
    cart: itemsByDraft.get(String(row.id)) || [],
  }));
}
