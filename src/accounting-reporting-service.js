const { createReportSummaryService } = require('./accounting-reporting-service/report-summary');
const { createInventoryReportingService } = require('./accounting-reporting-service/inventory-report');
const { createLedgerReportingService } = require('./accounting-reporting-service/ledgers');
const { createTreasuryReportingService } = require('./accounting-reporting-service/treasury');

// entry_type: entryType
// debit: amount > 0 ? amount : 0
// credit: amount < 0 ? Math.abs(amount) : 0
// summary: summarizeLedgerEntries(entries)
function createAccountingReportingService({ db, getSetting }) {
  return {
    ...createReportSummaryService({ db }),
    ...createInventoryReportingService({ db, getSetting }),
    ...createLedgerReportingService({ db }),
    ...createTreasuryReportingService({ db }),
  };
}

module.exports = { createAccountingReportingService };
