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
  createdBy?: string;
  createdByName?: string;
  items?: Array<{ productId: string; productName: string; qty: number; total: number; }>;
};

export function mapReturnRows(rows: Array<Record<string, unknown>>): ReturnListRow[] {
  const docMap = new Map<string, ReturnListRow>();
  
  for (const row of rows) {
    const docId = String(row.return_document_id);
    if (!docMap.has(docId)) {
      docMap.set(docId, {
        id: docId,
        rowId: docId,
        docNo: String(row.doc_no || 'RET-' + docId),
        returnType: (row.return_type === 'purchase' ? 'purchase' : 'sale'),
        type: (row.return_type === 'purchase' ? 'purchase' : 'sale'),
        invoiceId: row.invoice_id ? String(row.invoice_id) : '',
        productId: '',
        productName: '',
        qty: 0,
        total: 0,
        note: String(row.note || ''),
        settlementMode: String(row.settlement_mode || 'refund'),
        refundMethod: String(row.refund_method || ''),
        createdAt: row.created_at,
        date: row.created_at,
        createdBy: row.created_by ? String(row.created_by) : '',
        createdByName: String(row.created_by_name || ''),
        items: []
      });
    }
    const doc = docMap.get(docId)!;
    const itemQty = Number(row.qty || 0);
    const itemTotal = Number(row.line_total || 0);
    doc.qty += itemQty;
    doc.total += itemTotal;
    doc.items!.push({
      productId: row.product_id ? String(row.product_id) : '',
      productName: String(row.product_name || ''),
      qty: itemQty,
      total: itemTotal,
    });
  }

  const result = Array.from(docMap.values());
  for (const doc of result) {
    if (doc.items!.length === 1) {
      doc.productName = doc.items![0].productName;
      doc.productId = doc.items![0].productId;
    } else {
      doc.productName = `${doc.items!.length} أصناف`;
    }
  }

  return result;
}

export function filterReturnRows(rows: ReturnListRow[], query: Record<string, unknown>, today: string): ReturnListRow[] {
  const q = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim();
  const employee = String(query.employee || query.employeeName || '').trim().toLowerCase();

  return rows.filter((row) => {
    if (filter === 'sales' && row.returnType !== 'sale') return false;
    if (filter === 'purchase' && row.returnType !== 'purchase') return false;
    if (filter === 'today' && String(row.createdAt || '').slice(0, 10) !== today) return false;
    if (employee && !String(row.createdByName || '').toLowerCase().includes(employee)) return false;
    if (!q) return true;
    return [row.docNo, row.productName, row.note, row.returnType, row.createdByName].some((value) => String(value || '').toLowerCase().includes(q));
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
