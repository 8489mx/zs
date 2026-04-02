function buildSalesMutationResponse({ sale, relationalSales, relationalProducts, relationalCustomers, relationalTreasury }) {
  return {
    ok: true,
    sale,
    sales: relationalSales(),
    products: relationalProducts(),
    customers: relationalCustomers(),
    treasury: relationalTreasury(),
  };
}

module.exports = {
  buildSalesMutationResponse,
};
