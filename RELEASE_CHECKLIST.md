# Release Checklist

## Security
- Set a strong `SESSION_SECRET`
- Set `DEFAULT_ADMIN_PASSWORD` only for first boot, then rotate it
- Set `ALLOW_RESET_USERS=false` in production
- Set `ALLOW_RESTORE_USERS=false` unless explicitly needed
- Set `ALLOW_LEGACY_STATE_WRITE=false` after legacy flows are fully retired
- Use HTTPS and set `COOKIE_SECURE=true` behind TLS

## Data
- Verify backups restore on a staging copy
- Keep at least one recent encrypted backup outside the server
- Confirm `DB_FILE` points to the intended production database path

## Testing
- Run `npm test`
- Run `npm run smoke-test`
- Run `npm run test:integration`
- Perform one manual sale, purchase, return, and cancellation flow

## Operations
- Confirm `/api/health` returns `ok: true`
- Review startup logs for warnings
- Confirm the first admin changes the temporary password immediately if bootstrap generated one

## Phase 22 release gates
- Run `npm test` and confirm both baseline and Phase 22 tests pass.
- Manually verify one full accounting cycle with unit multipliers > 1.
- Verify backup restore rejects malformed payloads before mutating data.
- Compare customer/supplier balances against latest ledger balances on staging.
- Compare treasury net against transaction sum on staging.
- Confirm no invoice can be edited/cancelled after dependent return or payment flows.

- Verify `/api/admin/operational-readiness` returns no critical warnings.
- In production, set `COOKIE_SECURE=true`, `ENFORCE_SAME_ORIGIN_WRITES=true`, and confirm startup passes validation.
- Choose a logging format (`LOG_FORMAT=plain|json`) and confirm logs are collected centrally if available.


## Phase 28 final launch gate
- Run `npm run launch:gate` with the real launch `.env` loaded.
- Confirm the launch gate returns `ok: true` with zero `error` findings.
- Treat any remaining launch-gate `warning` as an explicit signoff item.
- Keep `HEALTH_EXPOSE_DETAILS=false` unless the endpoint is strictly internal.
- Remove localhost values from `ALLOWED_ORIGINS` before production cutover.
