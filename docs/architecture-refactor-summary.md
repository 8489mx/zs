# Architecture Refactor Summary

## What changed

### 1) Application composition extracted from `src/server.js`
The old server entrypoint mixed:
- runtime bootstrap
- middleware/security setup
- service wiring
- route registration
- terminal error/static handlers

It is now split into:
- `src/app/create-runtime-context.js`
- `src/app/create-service-container.js`
- `src/app/register-application-routes.js`
- `src/app/attach-terminal-handlers.js`
- `src/app/create-app.js`
- `src/server.js` as thin entrypoint

### 2) Database bootstrap extracted from `src/db.js`
The old file mixed:
- database file resolution
- corruption recovery
- wrapper helpers
- schema creation SQL
- index creation SQL
- post-schema migration steps

It is now split into:
- `src/db/index.js`
- `src/db/schema-sql.js`
- `src/db/indexes-sql.js`
- `src/db.js` as compatibility facade

### 3) System routes split by responsibility
The old `src/system-routes.js` handled all concerns in one file.
It is now decomposed into:
- `src/system-routes/common.js`
- `src/system-routes/import-operations.js`
- `src/system-routes/register-session-routes.js`
- `src/system-routes/register-user-routes.js`
- `src/system-routes/register-settings-routes.js`
- `src/system-routes/register-import-routes.js`
- `src/system-routes/register-backup-routes.js`
- `src/system-routes.js` as orchestration facade

## Architectural outcome
- thinner composition root
- better separation between runtime, domain wiring, routes, and persistence
- lower risk when changing one subsystem
- easier onboarding and code navigation
- improved testability of route groups and service wiring

## Validation run
- `npm test` ✅
- `npm run frontend:build` ✅
