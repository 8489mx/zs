# Batch 14

## Fixed
- Fixed Kysely join typing regression in `backend/src/modules/reports/reports.service.ts` by removing alias-based joins for `locations` and `branches` in inventory report location queries.
- Updated selected column references to use full table names so backend build no longer fails on these joins.
