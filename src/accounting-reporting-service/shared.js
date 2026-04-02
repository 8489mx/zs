function buildScope(range, branchColumn = 'branch_id', locationColumn = 'location_id') {
  const args = [range.from, range.to];
  const scope = [];
  const branchId = range && range.branchId ? Number(range.branchId) : null;
  const locationId = range && range.locationId ? Number(range.locationId) : null;
  if (branchId) {
    scope.push(`${branchColumn} = ?`);
    args.push(branchId);
  }
  if (locationId) {
    scope.push(`${locationColumn} = ?`);
    args.push(locationId);
  }
  return { args, where: scope.length ? ` AND ${scope.join(' AND ')}` : '' };
}

function normalizeLedgerEntry(row) {
  const amount = Number(row.amount || 0);
  const entryType = row.entry_type || 'manual';
  const createdAt = row.created_at || '';
  const balanceAfter = Number(row.balance_after || 0);
  return {
    id: String(row.id),
    type: entryType,
    entry_type: entryType,
    amount,
    debit: amount > 0 ? amount : 0,
    credit: amount < 0 ? Math.abs(amount) : 0,
    balanceAfter,
    balance_after: balanceAfter,
    note: row.note || '',
    referenceType: row.reference_type || '',
    reference_type: row.reference_type || '',
    referenceId: row.reference_id ? String(row.reference_id) : '',
    reference_id: row.reference_id ? String(row.reference_id) : '',
    date: createdAt,
    created_at: createdAt,
    doc_no: ''
  };
}

function summarizeLedgerEntries(entries) {
  return entries.reduce((summary, entry) => {
    summary.totalItems += 1;
    summary.debitTotal += Number(entry.debit || 0);
    summary.creditTotal += Number(entry.credit || 0);
    summary.net += Number(entry.amount || 0);
    summary.lastBalance = Number(entry.balance_after ?? entry.balanceAfter ?? summary.lastBalance ?? 0);
    return summary;
  }, { totalItems: 0, debitTotal: 0, creditTotal: 0, net: 0, lastBalance: 0 });
}

module.exports = { buildScope, normalizeLedgerEntry, summarizeLedgerEntries };
