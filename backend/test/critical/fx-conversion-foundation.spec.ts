/*
New file: backend/test/critical/fx-conversion-foundation.spec.ts
Pins the FX conversion foundation (INV-FX-CONVERSION-SINGLE-ENGINE).

THE GAP: every FX conversion rounded at its own hard-coded 2 decimals —
the revaluation engine (Math.round(*100)/100), the revaluation service
totals, and the display-only convertCurrency (toFixed(4)) each invented
its own rounding, so a 3-decimal tenant's revaluation was cut to cents
and a 0.005 KWD difference (five fils, five minor units) was skipped
entirely by the hard-coded 0.01 gates.

THE RULE: one pure conversion primitive, convertFxAmount, converts at
the TARGET currency's book digits through the canonical engine, and the
revaluation service is its first consumer: foreign balances normalize
at the FOREIGN currency's digits, revalued amounts and differences at
the BASE currency's digits, and every 0.01 gate becomes one minor unit
(10 ** -digits) — identical at 2 decimals, correct at 3.

WHAT THIS PINS:
- the pure engine at 2 and 3 digits, rate 1, negatives, zero, and
  fail-closed on a non-finite amount or a non-finite/non-positive rate.
- calculateForexDifference with REQUIRED digits, including the KWD
  case (100.13 USD at 48.5 revalues to 4856.305, not 4856.31).
- the REAL previewRevaluation on PGlite (KWD base, USD foreign):
  foreign normalization at USD digits, revaluation at KWD digits, and
  the 0.005 KWD account included by the minor-unit gate.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Database } from '../../src/database/database.types';
import { ForexRevaluationService } from '../../src/modules/accounting/services/forex-revaluation.service';
import { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';
import { convertFxAmount } from '../../src/modules/accounting/engines/fx-conversion.engine';
import { calculateForexDifference } from '../../src/modules/accounting/engines/forex-difference.engine';

// Pure engine: digits select the answer, not the formula.
assert.equal(convertFxAmount(100, 48.5, 2), 4850);
assert.equal(convertFxAmount(100.125, 48.5, 3), 4856.063);
assert.equal(convertFxAmount(100.125, 48.5, 2), 4856.06);
assert.equal(convertFxAmount(250, 1, 3), 250);
assert.equal(convertFxAmount(0, 48.5, 2), 0);
assert.equal(convertFxAmount(-100, 48.5, 2), -4850);
assert.equal(convertFxAmount(10.255, 1, 2), 10.26);
assert.throws(() => convertFxAmount(Number.NaN, 48.5, 2));
assert.throws(() => convertFxAmount(100, Number.NaN, 2));
assert.throws(() => convertFxAmount(100, 0, 2));
assert.throws(() => convertFxAmount(100, -48.5, 2));
assert.throws(() => convertFxAmount(100, Number.POSITIVE_INFINITY, 2));

// Revaluation difference engine: digits are required, 2-decimal pins unchanged.
assert.deepEqual(calculateForexDifference(150, 10, 40, 2), { revaluedLocal: 400, difference: 250 });
assert.deepEqual(calculateForexDifference(-150, -10, 40, 2), { revaluedLocal: -400, difference: -250 });
assert.deepEqual(calculateForexDifference(4856, 100.13, 48.5, 3), { revaluedLocal: 4856.305, difference: 0.305 });
assert.deepEqual(calculateForexDifference(4856.063, 100.125, 48.5, 3), { revaluedLocal: 4856.063, difference: 0 });
assert.throws(() => calculateForexDifference(Number.NaN, 10, 40, 2));
assert.throws(() => calculateForexDifference(150, 10, 0, 2));

async function main(): Promise<void> {
  const pg = new PGlite();
  const db = new Kysely<Database>({ dialect: new PGliteDialect(pg) });
  const auth = { tenantId: 't1', accountId: 'a1', role: 'admin', userId: 1, permissions: [] } as unknown as AuthContext;
  const service = new ForexRevaluationService(db, {} as never);

  try {
    await pg.exec(`
      CREATE TABLE settings (tenant_id text, key text, value text);
      CREATE TABLE currency_exchange_rates (id bigserial PRIMARY KEY, tenant_id text, currency_code text, exchange_rate numeric, is_base boolean, updated_at timestamptz);
      CREATE TABLE accounting_accounts (id bigint PRIMARY KEY, tenant_id text, code text, name_ar text, name_en text, account_type text, normal_balance text, is_active boolean, is_monetary boolean, revaluation_currency text, is_control_account boolean, is_receivable boolean, is_payable boolean, is_inventory boolean, parent_id bigint);
      CREATE TABLE accounting_settings (id bigint PRIMARY KEY, tenant_id text, customer_receivable_account_id bigint, supplier_payable_account_id bigint, inventory_account_id bigint);
      CREATE TABLE journal_entries (id bigint PRIMARY KEY, tenant_id text, status text, entry_date timestamptz, entry_no text, source_id bigint, updated_at timestamptz);
      CREATE TABLE journal_entry_lines (id bigserial PRIMARY KEY, tenant_id text, journal_entry_id bigint, account_id bigint, debit numeric, credit numeric);
      INSERT INTO settings VALUES ('t1','currency','KWD');
      INSERT INTO currency_exchange_rates (tenant_id, currency_code, exchange_rate, is_base) VALUES ('t1','KWD',1,true),('t1','USD',48.5,false);
      INSERT INTO accounting_accounts VALUES (10,'t1','1120','Bank USD','Bank USD','asset','debit',true,true,'USD',false,false,false,false,NULL);
      INSERT INTO accounting_accounts VALUES (11,'t1','1121','Petty USD','Petty USD','asset','debit',true,true,'USD',false,false,false,false,NULL);
      INSERT INTO accounting_settings VALUES (1,'t1',999,998,997);
      INSERT INTO journal_entries VALUES (1,'t1','posted','2026-10-01',NULL,NULL,NULL);
      INSERT INTO journal_entry_lines (tenant_id, journal_entry_id, account_id, debit, credit) VALUES ('t1',1,10,4856,0),('t1',1,11,0.005,0);
    `);

    const preview = await service.previewRevaluation(
      {
        periodDate: '2026-10-31',
        currencyCode: 'USD',
        closingRate: 48.5,
        items: [
          { accountId: 10, foreignBalance: 100.125 },
          { accountId: 11, foreignBalance: 0.0001 },
        ],
      },
      auth,
    );

    assert.equal((preview as { bookDigits?: number }).bookDigits, 3);
    assert.equal(preview.lines.length, 2);
    const main = preview.lines.find((l: { accountId: number }) => Number(l.accountId) === 10);
    assert.equal(main.foreignBalance, 100.13);
    assert.equal(main.bookLocalValue, 4856);
    assert.equal(main.revaluedLocalValue, 4856.305);
    assert.equal(main.unrealizedDifference, 0.305);
    const dust = preview.lines.find((l: { accountId: number }) => Number(l.accountId) === 11);
    assert.equal(dust.bookLocalValue, 0.005);
    assert.equal(dust.revaluedLocalValue, 0);
    assert.equal(dust.unrealizedDifference, -0.005);
    assert.equal(preview.totalForeignBalance, 100.13);
    assert.equal(preview.netUnrealizedGainLoss, 0.3);
  } finally {
    await db.destroy();
  }
}

main()
  .then(() => console.log('fx conversion foundation checks passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
