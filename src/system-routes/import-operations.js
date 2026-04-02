const { getImportRows } = require('./import-operations/shared');
const { createProductsImporter } = require('./import-operations/products');
const { createCustomersImporter } = require('./import-operations/customers');
const { createSuppliersImporter } = require('./import-operations/suppliers');
const { createOpeningStockImporter } = require('./import-operations/opening-stock');

function createImportOperations(dependencies) {
  return {
    getImportRows,
    importProductsRows: createProductsImporter(dependencies),
    importCustomersRows: createCustomersImporter(dependencies),
    importSuppliersRows: createSuppliersImporter(dependencies),
    importOpeningStockRows: createOpeningStockImporter(dependencies),
  };
}

module.exports = {
  createImportOperations,
};
