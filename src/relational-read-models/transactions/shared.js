function mapJoinedScope(row) {
  return {
    branchId: row.branch_id ? String(row.branch_id) : '',
    branchName: row.branch_name || '',
    locationId: row.location_id ? String(row.location_id) : '',
    locationName: row.location_name || '',
  };
}

function groupRowsByKey(rows, keyField, mapper) {
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row[keyField]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(mapper(row));
  }
  return grouped;
}

function formatAuditDetails(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    const parts = [];
    if (parsed.reason) parts.push(`السبب: ${parsed.reason}`);
    const after = parsed.after || {};
    if (after.docNo) parts.push(`المستند: ${after.docNo}`);
    if (after.total != null) parts.push(`الإجمالي: ${Number(after.total || 0)}`);
    if (after.paymentChannel) parts.push(`الدفع: ${after.paymentChannel}`);
    if (Array.isArray(after.payments) && after.payments.length) {
      parts.push(`الدفعات: ${after.payments.map((entry) => `${entry.paymentChannel}:${Number(entry.amount || 0)}`).join(' + ')}`);
    }
    if (after.status) parts.push(`الحالة: ${after.status}`);
    if (Array.isArray(after.items) && after.items.length) parts.push(`البنود: ${after.items.length}`);
    if (after.id && !after.docNo) parts.push(`المرجع: ${after.id}`);
    return parts.join(' | ') || text;
  } catch {
    return text;
  }
}

module.exports = {
  mapJoinedScope,
  groupRowsByKey,
  formatAuditDetails,
};
