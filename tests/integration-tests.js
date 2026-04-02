const { createIntegrationContext, closeIntegrationContext } = require('./integration/support');
const { runPermissionScenario } = require('./integration/scenarios/permissions');
const { runTransactionalScenario } = require('./integration/scenarios/transactions');
const { runSalesContractScenario } = require('./integration/scenarios/sales-contract');

(async () => {
  const ctx = await createIntegrationContext();
  try {
    const session = await runPermissionScenario(ctx);
    const transactionalState = await runTransactionalScenario(ctx, session);
    await runSalesContractScenario(ctx, { ...session, ...transactionalState });
    console.log('Integration tests passed');
  } finally {
    await closeIntegrationContext(ctx);
  }
})().catch((err) => {
  console.error('Integration tests failed');
  console.error(err);
  process.exit(1);
});
