# Batch 20

- Fixed TypeScript regressions reported during local smoke/typecheck.
- Simplified reports-query-pipeline helper typing to accept Kysely builders without invalid generic constraints.
- Restored missing imports for partner ledger totals helpers.
- Guarded date range usages in reports.service with non-null assertions for ranged report paths.
