function registerImportRoutes({ app, authMiddleware, requireAnyPermission, getImportRows, importProductsRows, importCustomersRows, importSuppliersRows, importOpeningStockRows, respondError }) {
  app.post('/api/import/products', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      res.status(201).json(importProductsRows(getImportRows(req), req.user));
    } catch (err) {
      respondError(res, err, 'Could not import products');
    }
  });

  app.post('/api/import/customers', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      res.status(201).json(importCustomersRows(getImportRows(req), req.user));
    } catch (err) {
      respondError(res, err, 'Could not import customers');
    }
  });

  app.post('/api/import/suppliers', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      res.status(201).json(importSuppliersRows(getImportRows(req), req.user));
    } catch (err) {
      respondError(res, err, 'Could not import suppliers');
    }
  });

  app.post('/api/import/opening-stock', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      res.status(201).json(importOpeningStockRows(getImportRows(req), req.user));
    } catch (err) {
      respondError(res, err, 'Could not import opening stock');
    }
  });
}

module.exports = {
  registerImportRoutes,
};
