function createTreasuryReportingService({ db }) {
  function addTreasuryTransaction(txnType, amount, note, referenceType, referenceId, userId, branchId, locationId) {
    db.prepare('INSERT INTO treasury_transactions (txn_type, amount, note, reference_type, reference_id, branch_id, location_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(txnType, Number(amount || 0), note || '', referenceType || null, referenceId || null, branchId ? Number(branchId) : null, locationId ? Number(locationId) : null, userId || null);
  }

  return { addTreasuryTransaction };
}

module.exports = { createTreasuryReportingService };
