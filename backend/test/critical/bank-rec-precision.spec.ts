/*
New file: backend/test/critical/bank-rec-precision.spec.ts
Pure spec: imports production bankStatementAmountsEqual, no
re-implemented formula. Run with the backend critical specs.

WHAT THIS PINS: a statement line auto-matches a GL line only when the
amounts are EXACTLY equal at the tenant's book precision. Before the
Treasury P1 package the workspace used < 0.01 and the manual-match
validation used > 0.01, so a KWD statement line of 100.129 matched a GL
line of 100.123 as "exact" and the 6-fils gap was marked reconciled and
hidden forever. Both sides are rounded to bookDigits first, so genuine
float noise (0.1 + 0.2 vs 0.3) still matches; a real difference does not.

*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { bankStatementAmountsEqual } from '../../src/modules/accounting/accounting.service';

// KWD (3dp): exact at the fil matches; one fil off does not.
assert.equal(bankStatementAmountsEqual(100.123, 100.123, 3), true);
assert.equal(bankStatementAmountsEqual(100.123, 100.124, 3), false);
// The old tolerance matched this pair (0.006 < 0.01) as "exact".
assert.equal(bankStatementAmountsEqual(100.123, 100.129, 3), false);
// EGP (2dp): exact at the cent matches; one cent off does not.
assert.equal(bankStatementAmountsEqual(100.12, 100.12, 2), true);
assert.equal(bankStatementAmountsEqual(100.12, 100.13, 2), false);
// Float noise is absorbed by rounding both sides first, at either precision.
assert.equal(bankStatementAmountsEqual(0.1 + 0.2, 0.3, 2), true);
assert.equal(bankStatementAmountsEqual(0.1 + 0.2, 0.3, 3), true);
// Signs matter: a deposit never matches a withdrawal of the same magnitude.
assert.equal(bankStatementAmountsEqual(100.123, -100.123, 3), false);

console.log('bank-rec-precision: all assertions passed');
