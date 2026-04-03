# Backend Migration Phase 4A — Users & Settings Slice

## Scope completed
This phase migrates only:
- users management endpoints
- settings endpoints
- session endpoints needed by this slice (`/api/auth/me`, session list/revoke, password change)

No catalog, inventory, sales, purchases, or reports migration is included.

## Migrated API surface
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/:id/unlock`
- `PUT /api/users` (bulk sync payload with `users[]`)
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`
- `POST /api/auth/sessions/revoke-others`
- `POST /api/auth/change-password`
- `GET /api/auth/me`

## Implementation notes
- Built as vertical slice modules: `users`, `settings`, `sessions`.
- Reuses Phase 3 foundations:
  - `SessionService` + `SessionAuthGuard`
  - `PermissionsGuard` / permissions metadata
  - `AuditService`
  - shared app error mapping
- Session extraction supports both `x-session-id` header and `session_id` cookie.

## Contract alignment
- `GET /api/users` supports query-driven filtering/pagination (`search`, `role`, `includeInactive`, `page`, `pageSize`) with legacy-like response shape: `{ users, pagination, summary }`.
- `PUT /api/users` is available for bulk users payload sync and returns `{ ok, users }`.
- `PUT /api/settings` enforces legacy-equivalent permission intent for settings management.
- `/api/auth/me` now resolves `mustChangePassword` and `usingDefaultAdminPassword` from current persisted user data and environment defaults.

## Known deltas
- Bulk sync currently upserts provided users without removing users omitted from payload to reduce destructive risk.
