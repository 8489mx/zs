export type ReturnListRow = {
  id: string;
  rowId: string;
  docNo: string;
  returnType: 'sale' | 'purchase';
  type: 'sale' | 'purchase';
  invoiceId: string;
  productId: string;
  productName: string;
  qty: number;
  total: number;
  note: string;
  settlementMode: string;
  refundMethod: string;
  createdAt: unknown;
  date: unknown;
};

export function mapReturnRows(rows: Array<Record<string, unknown>>): ReturnListRow[] {
  return rows.map((row) => ({
    id: String(row.return_document_id),
    rowId: String(row.id),
    docNo: String(row.doc_no || 'RET-' + String(row.return_document_id)),
    returnType: (row.return_type === 'purchase' ? 'purchase' : 'sale'),
    type: (row.return_type === 'purchase' ? 'purchase' : 'sale'),
    invoiceId: row.invoice_id ? String(row.invoice_id) : '',
    productId: row.product_id ? String(row.product_id) : '',
    productName: String(row.product_name || ''),
    qty: Number(row.qty || 0),
    total: Number(row.line_total || 0),
    note: String(row.note || ''),
    settlementMode: String(row.settlement_mode || 'refund'),
    refundMethod: String(row.refund_method || ''),
    createdAt: row.created_at,
    date: row.created_at,
  }));
}

export function filterReturnRows(rows: ReturnListRow[], query: Record<string, unknown>, today: string): ReturnListRow[] {
  const q = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim();

  return rows.filter((row) => {
    if (filter === 'sales' && row.returnType !== 'sale') return false;
    if (filter === 'purchase' && row.returnType !== 'purchase') return false;
    if (filter === 'today' && String(row.createdAt || '').slice(0, 10) !== today) return false;
    if (!q) return true;
    return [row.docNo, row.productName, row.note, row.returnType].some((value) => String(value || '').toLowerCase().includes(q));
  });
}

export function summarizeReturnRows(rows: ReturnListRow[], today: string) {
  return {
    totalItems: new Set(rows.map((row) => row.id)).size,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    salesReturns: new Set(rows.filter((row) => row.returnType === 'sale').map((row) => row.id)).size,
    purchaseReturns: new Set(rows.filter((row) => row.returnType === 'purchase').map((row) => row.id)).size,
    todayCount: new Set(rows.filter((row) => String(row.createdAt || '').slice(0, 10) === today).map((row) => row.id)).size,
    latestDocNo: rows[0]?.docNo || '',
  };
}
