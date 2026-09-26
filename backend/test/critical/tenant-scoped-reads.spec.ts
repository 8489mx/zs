import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Source guards for O27 and O28 (ARCHITECTURE_INVARIANTS.md §8). Both were reads that took an id
// straight from a request body and skipped the tenant filter, so the row they returned — and the
// scope derived from it — could belong to another tenant. A unit test cannot see that; the shape of
// the query is the thing worth freezing.

const read = (rel: string) => readFileSync(resolve(__dirname, '../../src', rel), 'utf8');

function testVanSalesReadsStayInTenant(): void {
  const src = read('modules/delivery-reps/van-sales.service.ts');

  for (const match of src.matchAll(/selectFrom\('(customers|products)'\)([\s\S]{0,400}?)\.executeTakeFirst(OrThrow)?\(\)/g)) {
    assert.ok(
      match[2].includes("'tenant_id'") || match[2].includes('tenant_id'),
      `O27: read of ${match[1]} in van-sales must filter by tenant_id:\n${match[0].slice(0, 200)}`,
    );
  }

  // Every trip fetched by an id from the request body belongs to the calling rep, not just the
  // tenant. Matches both the `vt.`-aliased style (executeFieldSale, recordFieldCollection,
  // settleTrip) and the plain, unaliased style (submitFieldReturn) — the safety property is the
  // same either way, and recordFieldReturn's removal (it bypassed the field-return approval
  // workflow entirely; see the exact same file's history) is exactly why this dropped from 4 to 3
  // under the old vt.-only regex, not because any remaining lookup lost its scope.
  const tripLookups = [...src.matchAll(/\.where\('(?:vt\.)?id', '=', payload\.tripId\)([\s\S]{0,300}?)\.executeTakeFirst(OrThrow)?\(\)/g)];
  assert.ok(tripLookups.length >= 4, 'the trip lookups are still there');
  for (const match of tripLookups) {
    assert.ok(/\b(?:vt\.)?tenant_id\b/.test(match[1]), 'O27: trip lookup filters by tenant');
    assert.ok(/\b(?:vt\.)?rep_id\b/.test(match[1]), `O27: trip lookup must also filter by rep_id:\n${match[0].slice(0, 200)}`);
  }
}

function testPayrollRunScopeComesFromTheCaller(): void {
  const src = read('modules/hr/hr.service.ts');

  const runSelect = src.match(/SELECT period_month, tenant_id[\s\S]{0,400}?FROM hr_payroll_runs WHERE[^`]*/);
  assert.ok(runSelect, 'the payroll run lookup is still there');
  assert.ok(
    /WHERE id = \$\{runId\} AND tenant_id = \$\{callerTenantId\}/.test(runSelect[0]),
    `O28: the payroll run must be read within the caller's tenant:\n${runSelect[0]}`,
  );

  for (const call of src.matchAll(/rebuildPayrollRunItems\(trx,[^)]*\)/g)) {
    assert.ok(/auth\.tenantId/.test(call[0]), `O28: every caller passes its tenant: ${call[0]}`);
  }
}

testVanSalesReadsStayInTenant();
testPayrollRunScopeComesFromTheCaller();
console.log('tenant-scoped-reads.spec: all checks passed');
