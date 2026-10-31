/*
New file: backend/test/critical/pdc-rate-variance-flagged.spec.ts
Pins the PDC rate variance rules (INV-PDC-RATE-VARIANCE-FLAGGED).

THE GAP: pdcCurrencySnapshot used a caller-supplied exchange rate
verbatim — only positivity was checked. A USD cheque booked with a
supplied rate of 1, or 1000, posted its journal on that number, at
both creation and settlement. A hard 5% rejection band would be
wrong too: contractual cheque rates legitimately differ from the
registered rate, and a rigid band blocks real collections when
the rate table lags the market.

THE RULE: a supplied rate stands, with two guards for
foreign-currency cheques. (1) Sanity guard: outside half to
double the registered rate the snapshot fails closed — the
catastrophic data-entry errors (1 or 1000 against a registered
48) never post. (2) Variance flag: a deviation over 5% is
accepted but flagged, with the registered rate stored alongside
for review. With no registered rate there is nothing to compare
against, so the supplied rate stands unflagged. Base-currency
supplied rates are ignored by definition (rate 1, never flagged).

WHAT THIS PINS, driving the REAL pdcCurrencySnapshot on PGlite
(EGP base tenant, registered USD rate 48, amount 100), plus a
PGlite proof of migration 2040000000269 (columns, defaults,
partial index, down):
- supplied 50 -> accepted, unflagged, reference 48.
- supplied 52 -> accepted, FLAGGED, reference 48.
- supplied 50.4 (exactly 5%) -> unflagged.
- supplied 24 (0.5x) and 96 (2x) -> accepted, flagged.
- supplied 23.99, 96.01, 1, 1000 -> rejected (plausible range).
- omitted -> registered 48, unflagged.
- EGP supplied 50 -> rate 1, unflagged, no reference.
- no registered USD row + supplied 50 -> accepted, unflagged.
- migration up adds both columns + index; a flagged row
  inserts; migration down removes them.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Database } from '../../src/database/database.types';
import { pdcCurrencySnapshot } from '../../src/modules/accounting/pdc-currency';
import { up, down } from '../../src/database/migrations/2040000000269_pdc_rate_variance_flag';

async function columns(pg: PGlite): Promise<string[]> {
  const res = await pg.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'accounting_cheques' AND column_name IN ('flagged_rate_variance', 'registered_exchange_rate') ORDER BY 1`,
  );
  return res.rows.map((r) => r.column_name);
}

async function main(): Promise<void> {
  const pg = new PGlite();
  const db = new Kysely<Database>({ dialect: new PGliteDialect(pg) });

  try {
    await pg.exec(`
      CREATE TABLE settings (tenant_id text, key text, value text);
      CREATE TABLE currency_exchange_rates (id bigserial PRIMARY KEY, tenant_id text, currency_code text, exchange_rate numeric, is_base boolean);
      CREATE TABLE accounting_cheques (id bigserial PRIMARY KEY, tenant_id text);
      INSERT INTO settings VALUES ('t1','currency','EGP');
      INSERT INTO currency_exchange_rates (tenant_id, currency_code, exchange_rate, is_base) VALUES ('t1','EGP',1,true),('t1','USD',48,false);
    `);

    const within = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 50);
    assert.equal(within.exchange_rate, 50);
    assert.equal(within.base_amount, 5000);
    assert.equal(within.flagged_rate_variance, false);
    assert.equal(within.registered_exchange_rate, 48);

    const flagged = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 52);
    assert.equal(flagged.exchange_rate, 52);
    assert.equal(flagged.flagged_rate_variance, true);
    assert.equal(flagged.registered_exchange_rate, 48);

    const edge = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 50.4);
    assert.equal(edge.flagged_rate_variance, false);

    const lowEdge = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 24);
    assert.equal(lowEdge.exchange_rate, 24);
    assert.equal(lowEdge.flagged_rate_variance, true);
    const highEdge = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 96);
    assert.equal(highEdge.exchange_rate, 96);
    assert.equal(highEdge.flagged_rate_variance, true);

    await assert.rejects(pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 23.99), /plausible range/);
    await assert.rejects(pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 96.01), /plausible range/);
    await assert.rejects(pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 1), /plausible range/);
    await assert.rejects(pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 1000), /plausible range/);

    const omitted = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100);
    assert.equal(omitted.exchange_rate, 48);
    assert.equal(omitted.flagged_rate_variance, false);

    const baseIgnored = await pdcCurrencySnapshot(db as never, 't1', 'EGP', 100, 50);
    assert.equal(baseIgnored.exchange_rate, 1);
    assert.equal(baseIgnored.flagged_rate_variance, false);
    assert.equal(baseIgnored.registered_exchange_rate, null);

    await pg.exec(`DELETE FROM currency_exchange_rates WHERE tenant_id = 't1' AND currency_code = 'USD'`);
    const unregistered = await pdcCurrencySnapshot(db as never, 't1', 'USD', 100, 50);
    assert.equal(unregistered.exchange_rate, 50);
    assert.equal(unregistered.flagged_rate_variance, false);
    assert.equal(unregistered.registered_exchange_rate, null);

    // Migration 2040000000269: up adds the columns and the index.
    await up(db as never);
    assert.deepEqual(await columns(pg), ['flagged_rate_variance', 'registered_exchange_rate']);
    await pg.query(
      `INSERT INTO accounting_cheques (tenant_id, flagged_rate_variance, registered_exchange_rate) VALUES ('t1', true, 48)`,
    );
    const idx = await pg.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'accounting_cheques' AND indexname = 'idx_accounting_cheques_rate_variance'`,
    );
    assert.equal(idx.rows.length, 1);
    await down(db as never);
    assert.deepEqual(await columns(pg), []);

    console.log('PDC rate variance flagged tests passed.');
  } finally {
    await db.destroy();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
