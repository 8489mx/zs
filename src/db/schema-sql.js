const { loadSqlFile } = require('./schema/load-sql');

module.exports = [
  loadSqlFile('core.sql'),
  loadSqlFile('catalog.sql'),
  loadSqlFile('sales-cash.sql'),
  loadSqlFile('purchases-ledgers.sql'),
].join('\n\n');
