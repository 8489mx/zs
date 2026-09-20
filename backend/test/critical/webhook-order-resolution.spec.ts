import { strict as assert } from 'node:assert';
import {
  planWebhookOrderLookup,
  selectUnambiguousOrder,
} from '../../src/modules/storefront/engines/webhook-order-resolution.engine';

// Regression coverage for invariant WH-1 (ARCHITECTURE_INVARIANTS.md section 4).
//
// The four public storefront payment webhooks (webhooks/paymob|xpay|tap|stripe)
// used to build their order lookup as:
//     if (tenantId) query = query.where(tenant_id = tenantId);
//     if (orderNumber) query = query.where(order_number = orderNumber);
// so a payload that simply omitted the tenant reference produced a bare
// `WHERE order_number = 'ON-260920-0001'` across every tenant, and the very next
// statement flipped whatever row came back to payment_status = 'paid'.
// `order_number` is per-tenant sequential, so that row belongs to an arbitrary
// tenant. These tests pin the fail-closed behaviour.

function testTenantReferenceAlwaysScopes(): void {
  const byOrderNumber = planWebhookOrderLookup({
    tenantId: 'tenant-a',
    orderNumber: 'ON-260920-0001',
    gatewayOrderId: 'pm_123',
  });
  assert.deepEqual(byOrderNumber, {
    mode: 'tenant_scoped',
    tenantId: 'tenant-a',
    by: 'order_number',
    value: 'ON-260920-0001',
  });

  // With a tenant but no order number, the gateway id is usable *within* that tenant.
  const byGatewayId = planWebhookOrderLookup({
    tenantId: 'tenant-a',
    orderNumber: '',
    gatewayOrderId: 'pm_123',
  });
  assert.deepEqual(byGatewayId, {
    mode: 'tenant_scoped',
    tenantId: 'tenant-a',
    by: 'gateway_order_id',
    value: 'pm_123',
  });

  // A tenant reference with nothing to identify the order is refused, not widened.
  assert.deepEqual(planWebhookOrderLookup({ tenantId: 'tenant-a', orderNumber: '', gatewayOrderId: '' }), {
    mode: 'refuse',
    reason: 'no_identifier',
  });

  console.log('  -> A tenant reference always constrains the lookup; a missing identifier refuses.');
}

function testOrderNumberAloneIsNeverAnIdentity(): void {
  // THE regression: no tenant reference + an order number must NOT produce a query.
  const plan = planWebhookOrderLookup({
    tenantId: '',
    orderNumber: 'ON-260920-0001',
    gatewayOrderId: '',
  });
  assert.deepEqual(
    plan,
    { mode: 'refuse', reason: 'no_tenant_reference' },
    'order_number alone must never select a row across tenants',
  );

  // Whitespace-only / null tenant references are not tenant references.
  for (const tenantId of ['', '   ', null, undefined]) {
    const p = planWebhookOrderLookup({ tenantId, orderNumber: 'ON-260920-0001', gatewayOrderId: '' });
    assert.equal(p.mode, 'refuse', `tenantId ${JSON.stringify(tenantId)} must not count as a tenant reference`);
  }

  // A blank gateway id does not rescue a missing tenant reference either.
  assert.deepEqual(planWebhookOrderLookup({ tenantId: '  ', orderNumber: 'ON-1', gatewayOrderId: '   ' }), {
    mode: 'refuse',
    reason: 'no_tenant_reference',
  });

  console.log('  -> order_number alone (no tenant reference) is refused, including blank/whitespace tenants.');
}

function testGatewayIdOnlyWhenUnambiguous(): void {
  const plan = planWebhookOrderLookup({ tenantId: '', orderNumber: '', gatewayOrderId: 'cs_test_abc' });
  assert.deepEqual(plan, { mode: 'gateway_id_unique', gatewayOrderId: 'cs_test_abc' });

  // Exactly one match is an identity.
  const single = [{ id: 1, tenant_id: 'tenant-a' }];
  assert.deepEqual(selectUnambiguousOrder(single), { id: 1, tenant_id: 'tenant-a' });

  // Same gateway id held by two tenants (separate merchant accounts) -> refuse.
  const collision = [
    { id: 1, tenant_id: 'tenant-a' },
    { id: 2, tenant_id: 'tenant-b' },
  ];
  assert.equal(selectUnambiguousOrder(collision), null, 'an ambiguous gateway id must not resolve');

  // No match -> refuse.
  assert.equal(selectUnambiguousOrder([]), null);

  console.log('  -> A gateway id resolves only when it matches exactly one order.');
}

function testPlanNeverWidensWithoutTenant(): void {
  // Property: for every input, dropping the tenant reference can only ever make the
  // plan more restrictive - it must never yield a tenant-unscoped order_number query.
  const orderNumbers = ['', 'ON-260920-0001', '  ON-260920-0002  '];
  const gatewayIds = ['', 'gw_1', '  gw_2  '];

  for (const orderNumber of orderNumbers) {
    for (const gatewayOrderId of gatewayIds) {
      const plan = planWebhookOrderLookup({ tenantId: '', orderNumber, gatewayOrderId });
      assert.notEqual(plan.mode, 'tenant_scoped', 'cannot be tenant-scoped without a tenant');
      if (plan.mode === 'gateway_id_unique') {
        assert.equal(plan.gatewayOrderId, gatewayOrderId.trim());
        assert.ok(plan.gatewayOrderId.length > 0, 'a blank gateway id must never become an identifier');
      }
    }
  }

  console.log('  -> Without a tenant reference no plan can ever reach a row by order_number.');
}

async function main(): Promise<void> {
  console.log('=== [O2] PUBLIC PAYMENT WEBHOOK ORDER RESOLUTION (WH-1) ===\n');

  console.log('[Test 1] A tenant reference always constrains the lookup');
  testTenantReferenceAlwaysScopes();

  console.log('[Test 2] order_number alone is never a cross-tenant identity');
  testOrderNumberAloneIsNeverAnIdentity();

  console.log('[Test 3] A gateway id identifies an order only when unambiguous');
  testGatewayIdOnlyWhenUnambiguous();

  console.log('[Test 4] Dropping the tenant reference never widens the plan');
  testPlanNeverWidensWithoutTenant();

  console.log('\n=== ALL WEBHOOK ORDER RESOLUTION TESTS PASSED (4/4) ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
