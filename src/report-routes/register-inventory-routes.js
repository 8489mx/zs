const { sendCsv } = require('./common');

function registerInventoryRoutes({ app, authMiddleware, requirePermission, inventoryReport, reportQueryService, csvFromRows }) {
  app.get('/api/reports/inventory', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryInventoryRows(Array.isArray(payload.items) ? payload.items : [], query));
    }
    return res.json(payload);
  });

  app.get('/api/reports/inventory.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const items = Array.isArray(payload.items) ? payload.items : [];
    const rows = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.categoryName || '',
      supplier: item.supplierName || '',
      stockQty: item.stockQty || 0,
      minStock: item.minStock || 0,
      retailPrice: item.retailPrice || 0,
      costPrice: item.costPrice || 0,
      status: item.status || '',
    }));
    sendCsv(res, 'report-inventory.csv', ['id', 'name', 'category', 'supplier', 'stockQty', 'minStock', 'retailPrice', 'costPrice', 'status'], rows, csvFromRows);
  });
}

module.exports = { registerInventoryRoutes };
