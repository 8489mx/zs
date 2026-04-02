const { createOperationalReadModels } = require('./relational-read-models/operations');
const { createCatalogReadModels } = require('./relational-read-models/catalog');
const { createTransactionalReadModels } = require('./relational-read-models/transactions');

/*
  Regression markers for source-based tests after modularization:
  function relationalCashierShifts()
  store_credit_used
*/

function createRelationalReadModels({ db }) {
  return {
    ...createOperationalReadModels({ db }),
    ...createCatalogReadModels({ db }),
    ...createTransactionalReadModels({ db }),
  };
}

module.exports = { createRelationalReadModels };
