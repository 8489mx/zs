# Core and accounting acceptance — 24 October 2026

This follows the owner's request to finish the accounting/core review, execute the missing acceptance work, fix failures and push the existing review branch. It supplements the earlier commercial-integrity report and the ARCH01/ARCH02 source reviews. It does **not** certify that all software, historical data or business rules are correct in every environment.

Upstream `main` at `1f506535` was integrated before this acceptance round. Its accounting and core fixes are preserved, including tenant/platform separation, control-account rules, cheque lifecycle, domain supplier mapping, inventory precision and installment recognition. The large merge diff includes that upstream work; the defects below were found and fixed during this round.

## Defects fixed

| Area | Reproduced failure / resulting behavior |
| --- | --- |
| Credit-sale tenant isolation | An unparenthesized raw `OR` escaped the customer/tenant filters and updated other customers' cached balances. The complete credit condition is now grouped. A later tenant's sales must leave earlier tenants reconciled. |
| Decimal credit sales | PostgreSQL inferred an integer for the standalone credit condition parameter and rejected `136.80`. The condition explicitly uses `numeric`. |
| Demo cleanup isolation | The same raw `OR` pattern selected other tenants' products and could delete their demo customers/suppliers when serialized JSON contained a space. All three predicates are grouped; a real database regression retains the foreign rows. Backup storage alone is stubbed for this regression. |
| Source recovery | Concurrent recovery workers could post two journals for a purchase because both passed the early lookup. Central posting now rechecks one-time commercial sources under the tenant accounting transaction lock and assigns the existing durable unique event key. Edit/reversal cycles and repeatable cheque events retain their separate identities. |
| Account creation | Lazily created system accounts omitted mandatory `account_id`; a WAC purchase return needing account `5190` failed. Creation now obtains the owner from this tenant's foundation through the same transaction, or fails explicitly. |
| Purchase retries | A committed retry returned the internal idempotency payload instead of the normal purchase response. First responses now expose `purchaseId`; retries reconstruct the complete response from the committed document. |
| Inventory transfers | Receiving/cancelling a transfer requested another pool connection while already holding its transaction. Inventory scope reads now use the supplied transaction. The core test runs with a one-connection pool. |
| Marketplace settlements | A legacy settings read similarly escaped the transaction and timed out on a one-connection pool. It now uses the transaction executor. |
| WHT extraction | The query referenced nonexistent supplier columns. It now reads supplier metadata; numeric/string source IDs are normalized so repeated/concurrent extraction recognizes the existing purchase. |
| Carrier credit dimensions | Credits now retain each original line's cost center, branch and location instead of reading the job's current dimensions. A mismatch between the linked supplier and the original payable line fails for reviewed reconciliation. |
| Fiscal reopening | `CONCAT` could not infer the bound note parameter type. Annual/monthly reopen notes explicitly cast it to text. Reopening preserves independent administrative locks. |
| Close readiness | The missing-source guard covered sales but omitted purchases and returns. The locked closing gate and read-only audit now share the missing-source query, including zero-price sales/returns with positive inventory cost. A persisted purchase without a journal blocks close without changing the year's state. |
| Database tenant references | Application validation rejected foreign tenant references, but direct database writes still accepted some of them. Migration `2040000000253` adds composite tenant FKs for user/branch/location ownership, journal dimensions/accounts/reversal links and accounting settings, plus finite journal-money checks. |

The new migration uses `NOT VALID` constraints: new writes are protected, historical violations are retained for explicit review. It changes no historical monetary values. Supporting indexes use `IF NOT EXISTS`. Mixed-width legacy migration names make numeric and lexical maxima disagree; `253` follows the actually executed lexical `252` head without moving an existing migration.

## Executable acceptance

The suite `backend/test/acceptance/core-accounting.postgres.spec.ts` imports the actual Nest application dependency graph and production services. It runs against an explicitly named, fully migrated, disposable local PostgreSQL database. It refuses remote hosts and non-test database names. Financial services, transactions, constraints and concurrent connections are real; external background schedulers are not started.

The principal journey purchases ten units at 10 and ten at 20, sells four at 30 plus 14% VAT on credit, returns one sold unit and one unit from the first purchase, collects 50 and pays 30. Assertions include:

| Final amount | Expected base-currency value |
| --- | ---: |
| Customer / AR | 52.60 |
| Supplier / AP | 300.60 credit |
| Physical inventory / inventory GL | 240.00 |
| Cash | 20.00 |
| Recoverable purchase VAT | 40.60 |
| Sales VAT | 12.60 credit |
| Purchase price variance | 5.00 |
| COGS | 45.00 |

Additional scenarios exercise atomic rollback after forced tax-lock failure; concurrent last-stock sales; concurrent manual reversals; concurrent and lost-response purchase retries; concurrent source recovery; tenant FK/NaN rejection; concurrent marketplace settlements and changed-payload rejection; a one-connection settlement pool; USD cheque receive/deposit/bounce/restore/concurrent collection with original book value 5000 and collection 5100/FX gain 100; concurrent WHT extraction; a USD carrier credit reversing 500 from a 5000 base invoice; annual/monthly close/reopen with explicit lock release; deliberate discrepancy detection; cross-tenant demo cleanup; and migration repeatability/evidence preservation.

Validation on the final candidate:

| Check | Result |
| --- | --- |
| Fresh PostgreSQL migration history | 348 migrations applied successfully |
| Real PostgreSQL core/security audit | 10/10 passed, including a single-connection transfer pool |
| Production-service PostgreSQL accounting acceptance | 18/18 scenarios passed |
| Backend infrastructure/critical regression files | 133/133 passed |
| Frontend Vitest | 79/79 files, 419/419 tests passed |
| Backend and frontend TypeScript checks | Passed; frontend used a 6144 MB Node heap |
| Frontend QA | Performance, functional, API, mutation envelopes, routes, composition and architecture passed |
| Backend stock architecture guard | Passed |
| Read-only reconciliation CLI | Clean tenant exits 0; intentionally discrepant tenant and nonexistent tenant exit 1 |

The 133 backend regression files ran as separate sequential processes with `TS_NODE_TRANSPILE_ONLY=true`, followed by a separate complete TypeScript check. The real PostgreSQL suite uses the same runtime/typecheck separation. The frontend component suite used two workers. No local application build or deployment was run.

## Read-only data acceptance

`check:accounting-integrity` requires an explicit connection URL and tenant. It does not load dotenv or select a default production database. It runs in a PostgreSQL **read-only, repeatable-read transaction**, outputs JSON, and exits 1 on discrepancies or errors:

```bash
cd backend
# Set ACCOUNTING_AUDIT_DATABASE_URL securely to the reviewed database/copy.
npm run check:accounting-integrity -- TENANT_ID
```

Checks cover posted journal balance/line counts, invalid money, journal tenant references, user default-branch ownership, customer/supplier ledger caches, partner GL balances, location quantities, inventory valuation, unresolved postings, repeated commercial source journals, missing source journals and reciprocal reversal links. Samples are capped at 100 per check while counts cover all matching rows. The acceptance suite deliberately corrupts a cached balance inside a rolled-back transaction and verifies detection. A nonexistent tenant is an error, never a green report.

This is an investigation gate. An inventory valuation difference can require reconciling additional inventory accounts or sector-specific valuation sources. A passing report applies to the listed checks and tenant snapshot; it does not prove every domain, tax rule or historical identity. Findings must be reviewed against original documents and corrected using approved adjustments/reversals, preserving posted history.

## Completion boundary

- A fresh local database and synthetic tenant fixtures have been exercised; no production database was accessed or rewritten and no deployment occurred.
- A redacted production-restored copy must still be reconciled for each actual tenant, especially after the cross-customer balance defect. `NOT VALID` constraints deliberately leave historical exceptions visible. Validate them only after reviewed data reconciliation.
- Browser workflows, the packaged Electron/offline runtime, restore on a customer's installation, actual bank/tax gateways, and exhaustive sector-specific financial journeys are outside this executable sign-off. The full Nest service graph is not a substitute for HTTP/browser/packaged-runtime acceptance.
- CI now contains an isolated PostgreSQL acceptance workflow. Recurring regression checks and data reconciliation provide a defensible release gate; “100% forever” is not a claim supported by these results.

## Reproduction

Use a disposable PostgreSQL 16 database named `zs_core_audit_test` on `127.0.0.1:5433` (the existing core audit uses that name/port), with the documented test-only `postgres` credentials. Never point these mutation suites at production.

```bash
cd backend
# Export DATABASE_* for the disposable instance, NODE_ENV=test,
# APP_MODE=CLOUD_SAAS, and a test SESSION_CSRF_SECRET.
DOTENV_CONFIG_PATH=/dev/null npm run migration:run
npx ts-node test/critical/core-integrity-audit.spec.ts
# Set ACCEPTANCE_DATABASE_URL explicitly to that local disposable database.
npm run test:accounting:postgres
```

See `.github/workflows/accounting-acceptance.yml` for a complete disposable CI setup. No local build is required by the service acceptance suite.
