function sumAmounts(entries) {
  return Number(((entries || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)).toFixed(2));
}

function lastBalance(entries) {
  if (!Array.isArray(entries) || !entries.length) return 0;
  const ordered = [...entries].sort((a, b) => {
    const ad = new Date(a.created_at || a.date || 0).getTime();
    const bd = new Date(b.created_at || b.date || 0).getTime();
    if (ad !== bd) return ad - bd;
    return Number(a.id || 0) - Number(b.id || 0);
  });
  const last = ordered[ordered.length - 1];
  return Number(last.balance_after || last.balanceAfter || 0);
}

function assertLedgerConsistency(entityLabel, storedBalance, entries) {
  const summed = sumAmounts(entries);
  const ending = lastBalance(entries);
  const current = Number(storedBalance || 0);
  if (Math.abs(summed - ending) > 0.009) {
    throw new Error(entityLabel + ' ledger is internally inconsistent');
  }
  if (Math.abs(current - ending) > 0.009) {
    throw new Error(entityLabel + ' balance does not match ledger');
  }
  return { ok: true, balance: current, summed, ending };
}

function assertStockConsistency(product, movements, expectedStock) {
  const start = Number(product.initialStock || 0);
  const delta = Number(((movements || []).reduce((sum, entry) => sum + Number(entry.qty || 0), 0)).toFixed(2));
  const calculated = Number((start + delta).toFixed(2));
  const current = Number(expectedStock == null ? product.stock_qty || product.stock || 0 : expectedStock);
  if (Math.abs(calculated - current) > 0.009) {
    throw new Error('Stock balance does not match stock movements');
  }
  if (current < -0.009) {
    throw new Error('Stock cannot be negative');
  }
  return { ok: true, calculated, current };
}

function assertTreasuryConsistency(transactions, expectedNet) {
  const net = sumAmounts(transactions);
  const current = Number(expectedNet || 0);
  if (Math.abs(net - current) > 0.009) {
    throw new Error('Treasury net does not match transactions');
  }
  return { ok: true, net };
}

module.exports = {
  sumAmounts,
  lastBalance,
  assertLedgerConsistency,
  assertStockConsistency,
  assertTreasuryConsistency
};
