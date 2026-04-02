# Backend Migration Phase 1 Remediation Note

## What changed
- Replaced TypeORM with **Kysely + PostgreSQL**.
- Replaced TypeORM migration setup with **Kysely migrator** and file-based migration provider.
- Removed misleading configurable health path; health route is explicitly `/health`.
- Kept NestJS scaffold, env validation, logging, request validation, exception filter, request-id interceptor, and graceful shutdown.

## Reproducible run steps
```bash
cd backend-new
npm install
cp .env.example .env
npm run build
npm run test:smoke
npm run migration:list
npm run start
```

## Environment verification note
If `npm install` fails in your execution environment, capture the exact error and rerun with:
```bash
npm config get registry
npm install --verbose
```
This separates package-manager policy/network issues from project setup issues.
