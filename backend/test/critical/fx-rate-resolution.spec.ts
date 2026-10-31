/*
New file: backend/test/critical/fx-rate-resolution.spec.ts
Pins the single FX rate resolver (INV-FX-RATE-RESOLUTION-SINGLE-RESOLVER).

THE GAP: three divergent resolvers answered the same question — how
much is one unit of a foreign currency worth in base currency, right
now or at a moment in the past? pdcCurrencySnapshot (live only, with
PDC-only guards), the maritime file-private resolver (live only, with
its own settings-parsed base currency), and exchangeRateAsOf (history
only, with NO production consumer at all). A caller that needed a
historical rate had no shared path to one.

THE RULE: one resolver, resolveFxRate. The tenant base currency is
derived once, strictly, through tenantBaseCurrency (a settings/rate
mismatch fails closed instead of silently defaulting). Base currency
resolves to 1, even with a supplied rate. With an as-of moment the
rate comes from the append-only history and a supplied rate alongside
it is a contradiction that fails closed. With a supplied rate and no
moment, the supplied rate stands after validation. Otherwise the live
registered rate is used, failing closed when none exists.

WHAT THIS PINS, driving the REAL resolver on PGlite (EGP base,
USD live 48 with history 47 then 48, GBP history-only):
- live, base, omitted-currency, and supplied-rate cases.
- as-of reads from history, including a history-only currency and a
  moment before any rate existed.
- the strict base derivation: a tenant whose settings currency does
  not match its base row fails closed.
- Maritime delegation is pinned by the existing
  maritime-settlement-rate-resolved spec, whose settlement cases now
  run through this resolver; it is re-run with this package.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Database } from '../../src/database/database.types';
import { resolveFxRate } from '../../src/modules/accounting/fx-rate-resolution';

async function main(): Promise<void> {
  const pg = new PGlite();
  const db = new Kysely<Database>({ dialect: new PGliteDialect(pg) });

  try {
    await pg.exec(`
      CREATE TABLE settings (tenant_id text, key text, value text);
      CREATE TABLE currency_exchange_rates (id bigserial PRIMARY KEY, tenant_id text, currency_code text, exchange_rate numeric, is_base boolean);
      CREATE TABLE currency_exchange_rate_history (id bigserial PRIMARY KEY, tenant_id text, currency_code text, exchange_rate numeric, is_base boolean, effective_from timestamptz);
      INSERT INTO settings VALUES ('t1','currency','EGP'), ('t2','currency','EGP');
      INSERT INTO currency_exchange_rates (tenant_id, currency_code, exchange_rate, is_base) VALUES
        ('t1','EGP',1,true), ('t1','USD',48,false),
        ('t2','USD',1,true);
      INSERT INTO currency_exchange_rate_history (tenant_id, currency_code, exchange_rate, is_base, effective_from) VALUES
        ('t1','USD',47,false,'2026-09-01 00:00:00+00'),
        ('t1','USD',48,false,'2026-10-01 00:00:00+00'),
        ('t1','GBP',60,false,'2026-09-01 00:00:00+00');
    `);

    // Live resolution.
    assert.equal(await resolveFxRate(db, 't1', 'USD'), 48);
    assert.equal(await resolveFxRate(db, 't1', 'usd'), 48);

    // Base currency resolves to 1, even with a supplied rate, and an
    // omitted currency means the base currency.
    assert.equal(await resolveFxRate(db, 't1', 'EGP'), 1);
    assert.equal(await resolveFxRate(db, 't1', 'EGP', { suppliedRate: 50 }), 1);
    assert.equal(await resolveFxRate(db, 't1', undefined), 1);

    // A supplied rate stands after validation.
    assert.equal(await resolveFxRate(db, 't1', 'USD', { suppliedRate: 50 }), 50);
    await assert.rejects(resolveFxRate(db, 't1', 'USD', { suppliedRate: 0 }), /سعر الصرف يجب/);
    await assert.rejects(resolveFxRate(db, 't1', 'USD', { suppliedRate: -5 }), /سعر الصرف يجب/);
    await assert.rejects(resolveFxRate(db, 't1', 'USD', { suppliedRate: Number.NaN }), /سعر الصرف يجب/);

    // No registered rate fails closed.
    await assert.rejects(resolveFxRate(db, 't1', 'EUR'), /غير متاح/);

    // As-of resolution reads history, including a history-only currency.
    assert.equal(await resolveFxRate(db, 't1', 'USD', { asOf: '2026-09-15' }), 47);
    assert.equal(await resolveFxRate(db, 't1', 'USD', { asOf: new Date('2026-10-05T00:00:00Z') }), 48);
    assert.equal(await resolveFxRate(db, 't1', 'GBP', { asOf: '2026-09-15' }), 60);
    await assert.rejects(resolveFxRate(db, 't1', 'USD', { asOf: '2026-08-01' }), /No exchange rate was registered/);
    await assert.rejects(
      resolveFxRate(db, 't1', 'USD', { asOf: '2026-09-15', suppliedRate: 50 }),
      /cannot be combined/,
    );

    // Strict base derivation: settings say EGP but the base row is USD.
    await assert.rejects(resolveFxRate(db, 't2', 'USD'), /لا يطابق/);

    console.log('fx rate resolution checks passed');
  } finally {
    await db.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
