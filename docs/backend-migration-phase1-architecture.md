# Backend Migration Phase 1 Architecture Note

## Scope
This phase introduces a **parallel NestJS backend scaffold** in `backend-new/` only.
It does not alter existing business routes, frontend code, or production runtime behavior.

## Foundation Delivered
- NestJS + TypeScript modular monolith skeleton.
- Standardized config loading with startup env validation via Zod.
- PostgreSQL wiring through Kysely.
- Migration infrastructure using Kysely migrator.
- Structured logging via Pino.
- Global exception filter.
- Global request validation policy via Nest `ValidationPipe`.
- Request ID propagation (`x-request-id`) interceptor.
- Graceful shutdown hooks (`app.enableShutdownHooks()`).
- Health module with explicit `/health` endpoint.
- Smoke test to verify app context boot.

## Folder Layout
- `src/main.ts`: bootstrap and global middleware/pipes/filters/interceptors.
- `src/app.module.ts`: root module wiring.
- `src/config/*`: config registries and env schema validation.
- `src/database/*`: Kysely runtime config and migration tooling.
- `src/common/*`: cross-cutting foundations.
- `src/health/*`: liveness endpoint.
- `src/logging/*`: logger implementation and module.
- `test/smoke.ts`: minimal app boot smoke test.

## Run Instructions
```bash
cd backend-new
npm install
cp .env.example .env
npm run build
npm run test:smoke
npm run migration:list
npm run start
```
