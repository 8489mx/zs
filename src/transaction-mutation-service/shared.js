function createMutationSharedHelpers({ addAuditLog }) {
  function safeParseJson(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function snapshotInvoice(type, invoiceRow, items) {
    return safeParseJson({
      type,
      id: Number(invoiceRow.id || 0),
      docNo: invoiceRow.doc_no || '',
      status: invoiceRow.status || '',
      total: Number(invoiceRow.total || 0),
      discount: Number(invoiceRow.discount || 0),
      note: invoiceRow.note || '',
      paymentType: invoiceRow.payment_type || '',
      paymentChannel: invoiceRow.payment_channel || '',
      customerId: invoiceRow.customer_id ? Number(invoiceRow.customer_id) : null,
      supplierId: invoiceRow.supplier_id ? Number(invoiceRow.supplier_id) : null,
      storeCreditUsed: Number(invoiceRow.store_credit_used || 0),
      items: (items || []).map((item) => ({
        productId: Number(item.product_id || item.productId || 0),
        name: item.product_name || item.name || '',
        qty: Number(item.qty || 0),
        unitPrice: Number(item.unit_price || item.price || 0),
        unitCost: Number(item.unit_cost || item.cost || 0),
        unitName: item.unit_name || item.unitName || '',
        unitMultiplier: Number(item.unit_multiplier || item.unitMultiplier || 1),
        lineTotal: Number(item.line_total || item.total || 0)
      }))
    }, { type, id: Number(invoiceRow.id || 0) });
  }

  function writeSensitiveAudit(action, user, meta) {
    addAuditLog(action, JSON.stringify(safeParseJson({
      actorUserId: Number(user && user.id || 0),
      actorRole: String(user && user.role || ''),
      ...meta
    }, meta || {})), user && user.id ? Number(user.id) : null);
  }

  function isCashPayment(paymentType, paymentChannel) {
    return paymentType !== 'credit' && paymentChannel !== 'card';
  }

  function normalizeCancellationReason(reason, label) {
    const cleaned = String(reason || '').trim();
    if (cleaned.length < 8) throw new Error(`${label} requires a clear reason with at least 8 characters`);
    return cleaned;
  }

  function normalizeEditReason(reason, label) {
    const cleaned = String(reason || '').trim();
    if (cleaned.length < 8) throw new Error(`${label} requires a clear reason with at least 8 characters`);
    return cleaned;
  }

  return {
    safeParseJson,
    snapshotInvoice,
    writeSensitiveAudit,
    isCashPayment,
    normalizeCancellationReason,
    normalizeEditReason,
  };
}

module.exports = { createMutationSharedHelpers };
