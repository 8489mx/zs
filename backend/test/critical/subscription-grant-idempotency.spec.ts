import { strict as assert } from 'node:assert';
import { decideSubscriptionGrant } from '../../src/modules/tenant-subscription/gateways/subscription-grant.engine';

// Regression coverage for invariant SUB-1 (ARCHITECTURE_INVARIANTS.md section 4).
//
// applySubscriptionPayment used to read the current subscription OUTSIDE the transaction,
// extend it, and insert a payment row keyed by the gateway's transaction reference with
// nothing checking whether that reference had already been applied. Every gateway retries,
// and XPay/Paymob sign a plain HMAC over the body with no nonce, so one captured webhook
// could be replayed indefinitely, each replay stacking another billing period. The three
// gateways also fell back to `GATEWAY-${Date.now()}` when the payload carried no id, which
// made even a legitimate retry look like a brand-new payment (F4).

function at(iso: string): Date {
  return new Date(iso);
}

function testMissingReferenceIsRefused(): void {
  for (const reference of ['', '   ', null, undefined]) {
    const decision = decideSubscriptionGrant({
      transactionReference: reference,
      alreadyRecorded: false,
      currentPeriodEndsAt: null,
      currentPeriodIsLive: false,
      durationMonths: 12,
      now: at('2026-09-20T10:00:00Z'),
    });
    assert.deepEqual(
      decision,
      { action: 'refuse', reason: 'missing_reference' },
      `reference ${JSON.stringify(reference)} must not grant a billing period`,
    );
  }

  console.log('  -> A successful payment with no gateway reference never grants a period.');
}

function testReplayIsANoOp(): void {
  const base = {
    transactionReference: 'xpay_txn_9f3c',
    currentPeriodEndsAt: at('2027-01-01T00:00:00Z'),
    currentPeriodIsLive: true,
    durationMonths: 12,
    now: at('2026-09-20T10:00:00Z'),
  };

  const first = decideSubscriptionGrant({ ...base, alreadyRecorded: false });
  assert.equal(first.action, 'grant');

  // Same signed payload delivered again -> must not extend anything.
  const replay = decideSubscriptionGrant({ ...base, alreadyRecorded: true });
  assert.deepEqual(replay, { action: 'duplicate', reference: 'xpay_txn_9f3c' });

  // And the reference is reported back so the caller can log/return it.
  assert.equal(replay.action === 'duplicate' ? replay.reference : '', 'xpay_txn_9f3c');

  console.log('  -> A replayed reference is a no-op, not a second billing period.');
}

function testPeriodsDoNotStack(): void {
  const now = at('2026-09-20T10:00:00Z');

  // A live period carries its unused remainder over: the new period starts at the old end.
  const carried = decideSubscriptionGrant({
    transactionReference: 'ref-1',
    alreadyRecorded: false,
    currentPeriodEndsAt: at('2027-01-01T00:00:00Z'),
    currentPeriodIsLive: true,
    durationMonths: 12,
    now,
  });
  assert.equal(carried.action, 'grant');
  if (carried.action === 'grant') {
    assert.equal(carried.startsAt.toISOString(), '2027-01-01T00:00:00.000Z');
    assert.equal(carried.endsAt.toISOString(), '2028-01-01T00:00:00.000Z');
  }

  // An expired period does NOT carry over - the new period starts now, not from the
  // stale end date, otherwise a lapsed tenant would be credited for the gap.
  const expired = decideSubscriptionGrant({
    transactionReference: 'ref-2',
    alreadyRecorded: false,
    currentPeriodEndsAt: at('2026-01-01T00:00:00Z'),
    currentPeriodIsLive: false,
    durationMonths: 12,
    now,
  });
  assert.equal(expired.action, 'grant');
  if (expired.action === 'grant') {
    assert.equal(expired.startsAt.toISOString(), now.toISOString());
    assert.equal(expired.endsAt.toISOString(), '2027-09-20T10:00:00.000Z');
  }

  // A live-but-already-lapsed end date also starts from now.
  const lapsed = decideSubscriptionGrant({
    transactionReference: 'ref-3',
    alreadyRecorded: false,
    currentPeriodEndsAt: at('2026-05-01T00:00:00Z'),
    currentPeriodIsLive: true,
    durationMonths: 1,
    now,
  });
  assert.equal(lapsed.action, 'grant');
  if (lapsed.action === 'grant') {
    assert.equal(lapsed.startsAt.toISOString(), now.toISOString());
  }

  console.log('  -> Remaining time carries over only from a live period; a lapsed one starts fresh.');
}

function testDurationIsSanitised(): void {
  const now = at('2026-09-20T10:00:00Z');
  const cases: Array<[unknown, string]> = [
    [0, '2027-09-20T10:00:00.000Z'],
    [-6, '2027-09-20T10:00:00.000Z'],
    [Number.NaN, '2027-09-20T10:00:00.000Z'],
    [1, '2026-10-20T10:00:00.000Z'],
  ];

  for (const [months, expectedEnd] of cases) {
    const decision = decideSubscriptionGrant({
      transactionReference: 'ref',
      alreadyRecorded: false,
      currentPeriodEndsAt: null,
      currentPeriodIsLive: false,
      durationMonths: months as number,
      now,
    });
    assert.equal(decision.action, 'grant');
    if (decision.action === 'grant') {
      assert.equal(
        decision.endsAt.toISOString(),
        expectedEnd,
        `durationMonths ${String(months)} must never shorten or reverse the period`,
      );
    }
  }

  console.log('  -> A zero/negative/NaN duration falls back to 12 months, never backwards.');
}

async function main(): Promise<void> {
  console.log('=== [ITEM 3] SUBSCRIPTION GRANT IDEMPOTENCY (SUB-1) ===\n');

  console.log('[Test 1] A payment with no gateway reference is refused');
  testMissingReferenceIsRefused();

  console.log('[Test 2] A replayed webhook grants nothing');
  testReplayIsANoOp();

  console.log('[Test 3] Billing periods extend, they do not stack');
  testPeriodsDoNotStack();

  console.log('[Test 4] Duration is sanitised');
  testDurationIsSanitised();

  console.log('\n=== ALL SUBSCRIPTION GRANT IDEMPOTENCY TESTS PASSED (4/4) ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
