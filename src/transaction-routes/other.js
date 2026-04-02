const { buildExpensesListResponse, buildReturnsListResponse } = require('../transaction-query-service');

function registerOtherTransactionRoutes(deps) {
  const {
    app, authMiddleware, requirePermission, createExpenseRecord, createReturnRecord,
    relationalExpenses, relationalTreasury, relationalReturns, relationalProducts,
    relationalCustomers, relationalSuppliers, helpers,
  } = deps;

  app.get('/api/expenses', authMiddleware, requirePermission('treasury'), (req, res) => {
    res.json(buildExpensesListResponse(relationalExpenses() || [], req.query || {}));
  });

  app.post('/api/expenses', authMiddleware, requirePermission('treasury'), (req, res) => {
    try {
      const result = createExpenseRecord(req.body || {}, req.user);
      res.status(201).json({ ...result, expenses: relationalExpenses(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not create expense');
    }
  });

  app.get('/api/returns', authMiddleware, requirePermission('returns'), (req, res) => {
    res.json(buildReturnsListResponse(relationalReturns() || [], req.query || {}));
  });

  app.post('/api/returns', authMiddleware, requirePermission('returns'), (req, res) => {
    try {
      const result = createReturnRecord(req.body || {}, req.user);
      res.status(201).json({ ...result, returns: relationalReturns(), products: relationalProducts(), customers: relationalCustomers(), suppliers: relationalSuppliers(), treasury: relationalTreasury() });
    } catch (err) {
      helpers.respondBadRequest(res, err, 'Could not create return');
    }
  });
}

module.exports = { registerOtherTransactionRoutes };
