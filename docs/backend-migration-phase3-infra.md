# Backend Migration Phase 3 Infrastructure Foundation

## Scope
Phase 3 adds shared backend infrastructure only (no migrated business modules/routes).

## Added foundations

### 1) Auth/session foundation
- `SessionService` validates session IDs against `sessions` table.
- `SessionAuthGuard` resolves request session and attaches `authContext`.
- Shared auth interfaces for request context typing.

### 2) Permissions foundation
- `RequirePermissions` decorator metadata.
- `PermissionsGuard` checks requested permissions against current auth context.
- `PermissionService` centralizes permission comparison logic.

### 3) Transaction helpers
- `TransactionHelper.runInTransaction` wraps Kysely transactions for future service migrations.

### 4) Validation + error conventions
- `AppError` expanded with explicit `statusCode` and machine `code`.
- `mapToHttpException` centralizes conversion from domain/system errors to HTTP errors.
- `parseWithZod` helper standardizes Zod validation usage in future modules.

### 5) Audit/logging hooks foundation
- `AuditService` writes audit events into `audit_logs` with actor support.
- Existing logging and global exception filter are aligned with the new mapper.

### 6) Config access helpers
- `ConfigAccessService` provides typed accessors for high-frequency app settings.

## Integration points prepared for later module migration
- users/settings: session + permission + audit hooks available.
- catalog/inventory/sales/ledgers: transaction helper + audit service + error conventions reusable.
- all upcoming modules: can use shared guards/decorators and validation utility.

## Notes
- No business module migration occurred.
- No legacy route migration occurred.
- No frontend or old backend runtime behavior was changed.
