async function runSalesContractScenario(ctx, session) {
  const { assert, api, port } = ctx;

  const listBefore = await api('GET', port, '/api/sales?page=1&pageSize=10', session.adminCookie);
  assert.equal(listBefore.status, 200);
  assert.ok(Array.isArray(listBefore.body.sales));
  assert.ok(listBefore.body.pagination);
  assert.ok(listBefore.body.summary);

  const createRes = await api('POST', port, '/api/sales', session.adminCookie, {
    customerId: session.customerId,
    paymentType: 'cash',
    items: [{ productId: session.productId, qty: 1, unitPrice: 25 }],
    paidAmount: 25,
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.ok, true);
  assert.ok(createRes.body.sale);
  assert.ok(Array.isArray(createRes.body.sales));
  assert.ok(Array.isArray(createRes.body.products));
  assert.ok(Array.isArray(createRes.body.customers));
  assert.ok(Array.isArray(createRes.body.treasury));

  const createdSaleId = String(createRes.body.sale.id);
  const detailsRes = await api('GET', port, `/api/sales/${createdSaleId}`, session.adminCookie);
  assert.equal(detailsRes.status, 200);
  assert.ok(detailsRes.body.sale);
  assert.equal(String(detailsRes.body.sale.id), createdSaleId);
}

module.exports = {
  runSalesContractScenario,
};
