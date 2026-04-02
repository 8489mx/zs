const { formatAuditDetails, mapJoinedScope } = require('./shared');

function createSimpleTransactionReaders({ db }) {
  function relationalTreasury() {
    return db.prepare(`
      SELECT tt.id, tt.txn_type, tt.amount, tt.note, tt.created_at, tt.branch_id, tt.location_id, b.name AS branch_name, l.name AS location_name
      FROM treasury_transactions tt
      LEFT JOIN branches b ON b.id = tt.branch_id
      LEFT JOIN stock_locations l ON l.id = tt.location_id
      ORDER BY tt.id DESC
    `).all().map((row) => ({
      id: String(row.id),
      type: row.txn_type || 'manual',
      amount: Number(row.amount || 0),
      note: row.note || '',
      date: row.created_at,
      ...mapJoinedScope(row),
    }));
  }

  function relationalAuditLogs() {
    return db.prepare(`
      SELECT a.id, a.action, a.details, a.created_at, u.username
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.id DESC
      LIMIT 500
    `).all().map((row) => ({
      id: String(row.id),
      action: row.action || '',
      details: row.details || '',
      detailsSummary: formatAuditDetails(row.details),
      rawDetails: row.details || '',
      user: row.username || '',
      date: row.created_at,
      createdAt: row.created_at,
      createdByName: row.username || '',
    }));
  }

  function relationalStockMovements() {
    return db.prepare(`
      SELECT sm.id, sm.product_id, p.name AS product_name, sm.movement_type, sm.qty, sm.before_qty, sm.after_qty,
             sm.reason, sm.note, sm.reference_type, sm.reference_id, sm.branch_id, sm.location_id, sm.created_at,
             b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      LEFT JOIN branches b ON b.id = sm.branch_id
      LEFT JOIN stock_locations l ON l.id = sm.location_id
      LEFT JOIN users u ON u.id = sm.created_by
      ORDER BY sm.id DESC
      LIMIT 1000
    `).all().map((row) => ({
      id: String(row.id),
      productId: row.product_id ? String(row.product_id) : '',
      productName: row.product_name || '',
      type: row.movement_type || 'adjust',
      qty: Number(row.qty || 0),
      beforeQty: Number(row.before_qty || 0),
      afterQty: Number(row.after_qty || 0),
      reason: row.reason || '',
      note: row.note || '',
      referenceType: row.reference_type || '',
      referenceId: row.reference_id ? String(row.reference_id) : '',
      createdBy: row.created_by_name || '',
      date: row.created_at,
      ...mapJoinedScope(row),
    }));
  }

  function relationalExpenses() {
    return db.prepare(`
      SELECT e.id, e.title, e.amount, e.note, e.expense_date, e.branch_id, e.location_id, b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
      FROM expenses e
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN stock_locations l ON l.id = e.location_id
      LEFT JOIN users u ON u.id = e.created_by
      ORDER BY datetime(COALESCE(e.expense_date, e.created_at)) DESC, e.id DESC
    `).all().map((row) => ({
      id: String(row.id),
      title: row.title || '',
      amount: Number(row.amount || 0),
      date: row.expense_date,
      note: row.note || '',
      createdBy: row.created_by_name || '',
      ...mapJoinedScope(row),
    }));
  }

  function relationalSupplierPayments() {
    return db.prepare(`
      SELECT sp.id, sp.doc_no, sp.supplier_id, sp.amount, sp.note, sp.payment_date, sp.branch_id, sp.location_id, b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
      FROM supplier_payments sp
      LEFT JOIN branches b ON b.id = sp.branch_id
      LEFT JOIN stock_locations l ON l.id = sp.location_id
      LEFT JOIN users u ON u.id = sp.created_by
      ORDER BY datetime(COALESCE(sp.payment_date, sp.created_at)) DESC, sp.id DESC
    `).all().map((row) => ({
      id: String(row.id),
      docNo: row.doc_no || `PO-${row.id}`,
      supplierId: String(row.supplier_id),
      amount: Number(row.amount || 0),
      note: row.note || '',
      date: row.payment_date,
      createdBy: row.created_by_name || '',
      ...mapJoinedScope(row),
    }));
  }

  function relationalReturns() {
    return db.prepare(`
      SELECT r.id, r.doc_no, r.return_type, r.invoice_id, r.product_id, r.product_name, r.qty, r.total, r.settlement_mode, r.refund_method, r.note, r.branch_id, r.location_id, r.created_at,
             b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
      FROM returns r
      LEFT JOIN branches b ON b.id = r.branch_id
      LEFT JOIN stock_locations l ON l.id = r.location_id
      LEFT JOIN users u ON u.id = r.created_by
      ORDER BY r.id DESC
    `).all().map((row) => ({
      id: String(row.id),
      docNo: row.doc_no || `R-${row.id}`,
      type: row.return_type || 'sale',
      invoiceId: row.invoice_id ? String(row.invoice_id) : '',
      productId: row.product_id ? String(row.product_id) : '',
      productName: row.product_name || '',
      qty: Number(row.qty || 0),
      total: Number(row.total || 0),
      settlementMode: row.settlement_mode || 'refund',
      refundMethod: row.refund_method || '',
      note: row.note || '',
      date: row.created_at,
      createdBy: row.created_by_name || '',
      ...mapJoinedScope(row),
    }));
  }

  return {
    relationalTreasury,
    relationalAuditLogs,
    relationalStockMovements,
    relationalExpenses,
    relationalSupplierPayments,
    relationalReturns,
  };
}

module.exports = { createSimpleTransactionReaders };
