import assert from 'node:assert/strict';
import {
  resolveUserLimit,
  isUserLimitReached,
  describeUserLimit,
} from '../../src/modules/users/engines/user-plan-limit.engine';

async function testOmnichannelUnlimitedWithActiveSubscription(): Promise<void> {
  const limit = resolveUserLimit({
    hasActiveSubscription: true,
    subscriptionMaxUsers: null,
    subscriptionPlanCode: 'OMNICHANNEL',
    subscriptionFeaturePlanId: 'plan_omnichannel',
    tenantPlanId: 'plan_omnichannel',
    isTrial: false,
  });

  assert.equal(limit, null, 'Omnichannel plan limit must be null (unlimited)');
  assert.equal(describeUserLimit(limit), 'غير محدود');
  assert.equal(isUserLimitReached(limit, 0), false);
  assert.equal(isUserLimitReached(limit, 3), false, 'Must not block at 3 users');
  assert.equal(isUserLimitReached(limit, 4), false, 'Must not block at 4 users (the reported issue)');
  assert.equal(isUserLimitReached(limit, 100), false, 'Must not block at 100 users');
}

async function testOmnichannelTenantWithoutActiveSub(): Promise<void> {
  const limit = resolveUserLimit({
    hasActiveSubscription: false,
    tenantPlanId: 'plan_omnichannel',
    isTrial: false,
  });

  assert.equal(limit, null, 'Omnichannel tenant limit must be null (unlimited)');
  assert.equal(isUserLimitReached(limit, 4), false);
}

async function testUltimateEnterpriseUnlimited(): Promise<void> {
  const limitSub = resolveUserLimit({
    hasActiveSubscription: true,
    subscriptionPlanCode: 'ULTIMATE',
    subscriptionFeaturePlanId: 'plan_ultimate',
    subscriptionMaxUsers: null,
    tenantPlanId: 'plan_ultimate',
    isTrial: false,
  });
  assert.equal(limitSub, null);
  assert.equal(isUserLimitReached(limitSub, 50), false);

  const limitTenant = resolveUserLimit({
    hasActiveSubscription: false,
    tenantPlanId: 'plan_ultimate',
    isTrial: false,
  });
  assert.equal(limitTenant, null);
  assert.equal(isUserLimitReached(limitTenant, 50), false);
}

async function testProPlanCapped(): Promise<void> {
  const limitWithSub = resolveUserLimit({
    hasActiveSubscription: true,
    subscriptionMaxUsers: 6,
    subscriptionPlanCode: 'PRO',
    subscriptionFeaturePlanId: 'plan_pro',
    tenantPlanId: 'plan_pro',
    isTrial: false,
  });
  assert.equal(limitWithSub, 6);
  assert.equal(isUserLimitReached(limitWithSub, 5), false);
  assert.equal(isUserLimitReached(limitWithSub, 6), true);

  const limitTenantOnly = resolveUserLimit({
    hasActiveSubscription: false,
    tenantPlanId: 'plan_pro',
    isTrial: false,
  });
  assert.equal(limitTenantOnly, 6);
  assert.equal(isUserLimitReached(limitTenantOnly, 5), false);
  assert.equal(isUserLimitReached(limitTenantOnly, 6), true);
}

async function testBasicPosPlanCapped(): Promise<void> {
  const limit = resolveUserLimit({
    hasActiveSubscription: true,
    subscriptionMaxUsers: 2,
    subscriptionPlanCode: 'BASIC',
    subscriptionFeaturePlanId: 'plan_basic',
    tenantPlanId: 'plan_basic',
    isTrial: false,
  });
  assert.equal(limit, 2);
  assert.equal(isUserLimitReached(limit, 1), false);
  assert.equal(isUserLimitReached(limit, 2), true);
}

async function testTrialFallback(): Promise<void> {
  const limit = resolveUserLimit({
    hasActiveSubscription: false,
    tenantPlanId: null,
    isTrial: true,
  });
  assert.equal(limit, 5);
  assert.equal(isUserLimitReached(limit, 4), false);
  assert.equal(isUserLimitReached(limit, 5), true);
}

async function testInactiveTenantDefaultFallback(): Promise<void> {
  const limit = resolveUserLimit({
    hasActiveSubscription: false,
    tenantPlanId: null,
    isTrial: false,
  });
  assert.equal(limit, 3);
  assert.equal(isUserLimitReached(limit, 2), false);
  assert.equal(isUserLimitReached(limit, 3), true);
}

(async () => {
  await testOmnichannelUnlimitedWithActiveSubscription();
  await testOmnichannelTenantWithoutActiveSub();
  await testUltimateEnterpriseUnlimited();
  await testProPlanCapped();
  await testBasicPosPlanCapped();
  await testTrialFallback();
  await testInactiveTenantDefaultFallback();
  console.log('user-plan-limit.spec: all checks passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
