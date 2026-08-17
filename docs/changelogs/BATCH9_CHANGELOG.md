# Batch 9 changelog

This cumulative package is built on top of the trusted `zs-main-batch8-cumulative.zip` baseline.

## Focus areas
- Auth/session isolation hardening between logins and logouts
- First-run setup flow completion for bootstrap `super_admin`
- Password rotation / default-password enforcement consistency
- Self-service user update session sync
- App-shell level bootstrap warning ownership

## Key files updated
- `frontend/src/config/app-defaults.ts`
- `frontend/src/lib/query-client-session.ts`
- `frontend/src/stores/auth-store.ts`
- `frontend/src/features/auth/hooks/useLoginForm.ts`
- `frontend/src/features/auth/useBootstrapAuth.ts`
- `frontend/src/features/auth/lib/post-login-route.ts`
- `frontend/src/features/settings/hooks/useFirstRunSetupFlow.ts`
- `frontend/src/features/settings/hooks/user-management/useUserManagementMutation.ts`
- `frontend/src/shared/layout/app-shell.tsx`
- `frontend/src/shared/system/system-status-banner.tsx`
- `frontend/src/shared/system/password-rotation-gate.tsx`
- `frontend/src/shared/system/settings-setup-flow-card.tsx`
- `frontend/src/shared/system/first-run-setup-checklist.tsx`

## Validation executed in this environment
### Passed plain-node QA / guardrails
- `node scripts/check-toolchain-alignment.cjs`
- `frontend/node scripts/dev-proxy-check.mjs`
- `frontend/node scripts/auth-setup-hardening-check.mjs`
- `frontend/node scripts/password-policy-sync-check.mjs`
- `frontend/node scripts/feature-structure-check.mjs`
- `frontend/node scripts/feature-boundary-check.mjs`
- `frontend/node scripts/import-layer-check.mjs`
- `frontend/node scripts/route-guard-check.mjs`
- `frontend/node scripts/critical-flow-check.mjs`
- `frontend/node scripts/release-candidate-check.mjs`
- `frontend/node scripts/release-audit.mjs`
- `frontend/node scripts/api-contract-alignment.mjs`
- `frontend/node scripts/api-envelope-check.mjs`
- `frontend/node scripts/functional-smoke.mjs`
- `backend/node scripts/check-architecture-guardrails.cjs`
- `backend/node scripts/verify-readiness.cjs`
- `backend/node scripts/check-env-safety.cjs`
- `backend/node scripts/check-go-live.cjs`
- `backend/node scripts/check-commercial-ready.cjs`

### Environment limitations
- Runtime available here is Node `18.19.0` / npm `9.2.0`
- Project targets Node `22` / npm `10`
- Dependency-based frontend commands requiring a populated `node_modules` tree were not verifiable here
