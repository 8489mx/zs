const { createDocumentTransactionReaders } = require('./transactions/document-readers');
const { createSimpleTransactionReaders } = require('./transactions/simple-readers');

function createTransactionalReadModels({ db }) {
  return {
    ...createSimpleTransactionReaders({ db }),
    ...createDocumentTransactionReaders({ db }),
  };
}

module.exports = { createTransactionalReadModels };
