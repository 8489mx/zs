const crypto = require('crypto');
const { asArray, countOf } = require('./utils');

function validateManifest({ relationalTables, metadataManifest, pushUniqueError, pushUniqueWarning }) {
  if (!relationalTables || !metadataManifest) return;

  const manifestTableCounts = metadataManifest.tableCounts && typeof metadataManifest.tableCounts === 'object'
    ? metadataManifest.tableCounts
    : {};
  Object.entries(manifestTableCounts).forEach(([tableName, expectedCount]) => {
    const actualCount = countOf(relationalTables[tableName]);
    if (Number(expectedCount || 0) !== actualCount) pushUniqueError(`manifest tableCounts mismatch for ${tableName}`);
  });

  const manifestLedgerTotals = metadataManifest.ledgerTotals && typeof metadataManifest.ledgerTotals === 'object'
    ? metadataManifest.ledgerTotals
    : {};
  const actualLedgerTotals = {
    customerLedgerAmount: Number(asArray(relationalTables.customer_ledger).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
    supplierLedgerAmount: Number(asArray(relationalTables.supplier_ledger).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
    treasuryNet: Number(asArray(relationalTables.treasury_transactions).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
    stockOnHand: Number(asArray(relationalTables.products).filter((row) => Number(row.is_active == null ? 1 : row.is_active) === 1).reduce((sum, row) => sum + Number(row.stock_qty || 0), 0).toFixed(2)),
    postedSalesTotal: Number(asArray(relationalTables.sales).filter((row) => String(row.status || 'posted') === 'posted').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    postedPurchasesTotal: Number(asArray(relationalTables.purchases).filter((row) => String(row.status || 'posted') === 'posted').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    expensesTotal: Number(asArray(relationalTables.expenses).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
    returnsTotal: Number(asArray(relationalTables.returns).reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
  };
  Object.entries(manifestLedgerTotals).forEach(([key, expectedValue]) => {
    if (Math.abs(Number(expectedValue || 0) - Number(actualLedgerTotals[key] || 0)) > 0.01) {
      pushUniqueError(`manifest ledgerTotals mismatch for ${key}`);
    }
  });

  if (metadataManifest.checksum && metadataManifest.checksumAlgorithm === 'sha256') {
    const checksumSource = JSON.stringify({
      tableCounts: manifestTableCounts,
      ledgerTotals: manifestLedgerTotals,
      exportedAtSeed: String(metadataManifest.generatedAt || '').slice(0, 19),
    });
    const checksum = crypto.createHash('sha256').update(checksumSource).digest('hex');
    if (checksum !== metadataManifest.checksum) {
      pushUniqueWarning('manifest checksum could not be verified exactly; validate export timestamp lineage before restore');
    }
  }
}

module.exports = { validateManifest };
