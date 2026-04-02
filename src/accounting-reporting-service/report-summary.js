const { buildScope } = require('./shared');

function createReportSummaryService({ db }) {
  function reportSummary(range) {
    const salesScope = buildScope(range);
    const sales = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(discount), 0) AS discountTotal
      FROM sales
      WHERE status = 'posted' AND created_at BETWEEN ? AND ?${salesScope.where}
    `).get(...salesScope.args);

    const purchasesScope = buildScope(range);
    const purchases = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
      FROM purchases
      WHERE status = 'posted' AND created_at BETWEEN ? AND ?${purchasesScope.where}
    `).get(...purchasesScope.args);

    const expensesScope = buildScope(range);
    const expenses = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE created_at BETWEEN ? AND ?${expensesScope.where}
    `).get(...expensesScope.args);

    const returnsScope = buildScope(range);
    const returns = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN return_type = 'sale' THEN total ELSE 0 END), 0) AS salesReturnsTotal,
        COALESCE(SUM(CASE WHEN return_type = 'purchase' THEN total ELSE 0 END), 0) AS purchaseReturnsTotal,
        COUNT(*) AS count
      FROM returns
      WHERE created_at BETWEEN ? AND ?${returnsScope.where}
    `).get(...returnsScope.args);

    const cogsScope = buildScope(range, 's.branch_id', 's.location_id');
    const cogs = db.prepare(`
      SELECT COALESCE(SUM(si.qty * COALESCE(si.cost_price, 0)), 0) AS total
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'posted' AND s.created_at BETWEEN ? AND ?${cogsScope.where}
    `).get(...cogsScope.args);

    const cashInScope = buildScope(range);
    const cashIn = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM treasury_transactions
      WHERE amount > 0 AND created_at BETWEEN ? AND ?${cashInScope.where}
    `).get(...cashInScope.args);

    const cashOutScope = buildScope(range);
    const cashOut = db.prepare(`
      SELECT COALESCE(ABS(SUM(amount)), 0) AS total
      FROM treasury_transactions
      WHERE amount < 0 AND created_at BETWEEN ? AND ?${cashOutScope.where}
    `).get(...cashOutScope.args);

    const topScope = buildScope(range);
    const salesByProduct = db.prepare(`
      SELECT product_name AS name, COALESCE(SUM(qty),0) AS qty, COALESCE(SUM(line_total),0) AS total
      FROM sale_items
      WHERE sale_id IN (SELECT id FROM sales WHERE status = 'posted' AND created_at BETWEEN ? AND ?${topScope.where})
      GROUP BY product_name
      ORDER BY total DESC, qty DESC
      LIMIT 10
    `).all(...topScope.args).map((row) => ({ name: row.name || '', qty: Number(row.qty || 0), revenue: Number(row.total || 0), total: Number(row.total || 0) }));

    const salesTotal = Number(sales.total || 0);
    const purchasesTotal = Number(purchases.total || 0);
    const expensesTotal = Number(expenses.total || 0);
    const salesReturnsTotal = Number(returns.salesReturnsTotal || 0);
    const purchaseReturnsTotal = Number(returns.purchaseReturnsTotal || 0);
    const cogsTotal = Number(cogs.total || 0);
    const netSales = Math.max(0, salesTotal - salesReturnsTotal);
    const netPurchases = Math.max(0, purchasesTotal - purchaseReturnsTotal);
    const grossProfit = netSales - cogsTotal;
    const netOperatingProfit = grossProfit - expensesTotal;
    const grossMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;

    return {
      range,
      sales: { count: Number(sales.count || 0), total: salesTotal, discountTotal: Number(sales.discountTotal || 0), netSales },
      purchases: { count: Number(purchases.count || 0), total: purchasesTotal, netPurchases },
      expenses: { count: Number(expenses.count || 0), total: expensesTotal },
      returns: { count: Number(returns.count || 0), salesTotal: salesReturnsTotal, purchasesTotal: purchaseReturnsTotal, total: salesReturnsTotal + purchaseReturnsTotal },
      treasury: { cashIn: Number(cashIn.total || 0), cashOut: Number(cashOut.total || 0), net: Number(cashIn.total || 0) - Number(cashOut.total || 0) },
      commercial: { cogs: cogsTotal, grossProfit, grossMarginPercent, netOperatingProfit, informationalOnlyPurchasesInPeriod: netPurchases },
      summary: {
        salesCount: Number(sales.count || 0),
        salesTotal,
        purchasesCount: Number(purchases.count || 0),
        purchasesTotal,
        expensesTotal,
        returnsTotal: salesReturnsTotal + purchaseReturnsTotal,
        salesReturnsTotal,
        purchaseReturnsTotal,
        netSales,
        netPurchases,
        cogs: cogsTotal,
        grossProfit,
        grossMarginPercent,
        netOperatingProfit,
        cashIn: Number(cashIn.total || 0),
        cashOut: Number(cashOut.total || 0),
        netCashFlow: Number(cashIn.total || 0) - Number(cashOut.total || 0)
      },
      topProducts: salesByProduct
    };
  }

  return { reportSummary };
}

module.exports = { createReportSummaryService };
