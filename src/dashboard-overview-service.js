function createDashboardOverviewService({ reportSummary, relationalProducts, relationalSales, relationalPurchases, relationalCustomers, relationalSuppliers }) {
  const dateKey = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const lastNDays = (days) => Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return dateKey(date.toISOString());
  });

  const getActiveOfferCount = (products, today) => products.filter((product) => {
    const offers = Array.isArray(product.offers) ? product.offers : [];
    return offers.some((offer) => {
      const from = String((offer && (offer.from || offer.start_date)) || '').slice(0, 10);
      const to = String((offer && (offer.to || offer.end_date)) || '').slice(0, 10);
      return (!from || from <= today) && (!to || to >= today);
    });
  }).length;

  function buildDashboardOverview(range) {
    const summary = reportSummary(range);
    const products = relationalProducts() || [];
    const sales = (relationalSales() || []).filter((sale) => sale.status !== 'cancelled');
    const purchases = (relationalPurchases() || []).filter((purchase) => purchase.status !== 'cancelled');
    const customers = relationalCustomers() || [];
    const suppliers = relationalSuppliers() || [];

    const currentDay = dateKey(new Date().toISOString());
    const todaySales = sales.filter((sale) => dateKey(sale.date) === currentDay);
    const todayPurchases = purchases.filter((purchase) => dateKey(purchase.date) === currentDay);

    const todaySalesAmount = todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const todayPurchasesAmount = todayPurchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
    const lowStock = products.filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0));
    const inventoryCost = products.reduce((sum, product) => sum + (Number(product.stock || 0) * Number(product.costPrice || 0)), 0);
    const inventorySaleValue = products.reduce((sum, product) => sum + (Number(product.stock || 0) * Number(product.retailPrice || 0)), 0);
    const customerDebt = customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0);
    const supplierDebt = suppliers.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0);
    const nearCreditLimit = customers.filter((customer) => Number(customer.creditLimit || 0) > 0 && Number(customer.balance || 0) >= Number(customer.creditLimit || 0) * 0.8 && Number(customer.balance || 0) <= Number(customer.creditLimit || 0)).length;
    const aboveCreditLimit = customers.filter((customer) => Number(customer.creditLimit || 0) > 0 && Number(customer.balance || 0) > Number(customer.creditLimit || 0)).length;
    const highSupplierBalances = suppliers.filter((supplier) => Number(supplier.balance || 0) >= 5000).length;
    const activeOffers = getActiveOfferCount(products, currentDay);

    const topTodayMap = new Map();
    todaySales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const entry = topTodayMap.get(item.productId) || { productId: item.productId, name: item.name, qty: 0, total: 0 };
        entry.qty += Number(item.qty || 0);
        entry.total += Number(item.total || 0);
        topTodayMap.set(item.productId, entry);
      });
    });
    const topToday = Array.from(topTodayMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const topCustomersMap = new Map();
    sales.forEach((sale) => {
      const key = String(sale.customerId || sale.customerName || 'cash');
      const entry = topCustomersMap.get(key) || { key, name: sale.customerName || 'عميل نقدي', total: 0, count: 0 };
      entry.total += Number(sale.total || 0);
      entry.count += 1;
      topCustomersMap.set(key, entry);
    });
    const topCustomers = Array.from(topCustomersMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    const topSuppliersMap = new Map();
    purchases.forEach((purchase) => {
      const key = String(purchase.supplierId || purchase.supplierName || 'supplier');
      const entry = topSuppliersMap.get(key) || { key, name: purchase.supplierName || 'مورد', total: 0, count: 0 };
      entry.total += Number(purchase.total || 0);
      entry.count += 1;
      topSuppliersMap.set(key, entry);
    });
    const topSuppliers = Array.from(topSuppliersMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    const dayKeys = lastNDays(7);
    const salesTrend = dayKeys.map((key) => ({ key, value: sales.filter((sale) => dateKey(sale.date) === key).reduce((sum, sale) => sum + Number(sale.total || 0), 0) }));
    const purchasesTrend = dayKeys.map((key) => ({ key, value: purchases.filter((purchase) => dateKey(purchase.date) === key).reduce((sum, purchase) => sum + Number(purchase.total || 0), 0) }));

    const outOfStockCount = lowStock.filter((product) => Number(product.stock || 0) <= 0).length;
    const summarySnapshot = {
      ...summary,
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      lowStockCount: lowStock.length,
      outOfStockCount,
      activeOffers,
    };

    return {
      range: summary.range,
      summary: summarySnapshot,
      stats: {
        productsCount: products.length,
        customersCount: customers.length,
        suppliersCount: suppliers.length,
        todaySalesCount: todaySales.length,
        todaySalesAmount,
        todayPurchasesCount: todayPurchases.length,
        todayPurchasesAmount,
        inventoryCost,
        inventorySaleValue,
        customerDebt,
        supplierDebt,
        nearCreditLimit,
        aboveCreditLimit,
        highSupplierBalances,
        activeOffers,
      },
      lowStock: lowStock.slice(0, 8),
      topToday,
      topCustomers,
      topSuppliers,
      trends: {
        sales: salesTrend,
        purchases: purchasesTrend,
      },
    };
  }

  return { buildDashboardOverview };
}

module.exports = { createDashboardOverviewService };
