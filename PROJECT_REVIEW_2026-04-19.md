# Project Review — 2026-04-19

## Scope executed
- Backend static review for configuration, security, auth, rate limiting, and DB migration behavior.
- Frontend quality baseline via lint + unit/integration test suite.
- Architecture guardrail script and backend auth-critical tests.

## Executive assessment
- **Overall score: 8.3 / 10**
- The codebase is generally mature (strong test coverage + explicit readiness checks), but there are **3 high-priority hardening items** before calling it fully production-hard.

## Critical / high-priority issues

1. **TLS verification disabled in migration clients when `DATABASE_SSL=true`**
   - Current migration code uses `ssl: { rejectUnauthorized: false }`, which permits MITM on DB TLS paths.
   - Impact: high in hosted/remote database deployments.
   - Recommendation: switch to strict TLS verification and provide optional CA path/env configuration.

2. **Config bypass in report timezone helper**
   - `reports-range.helper.ts` reads `process.env` directly (`BUSINESS_TIMEZONE` / `APP_TIMEZONE`) instead of centralized validated config service.
   - Impact: medium-high; can create inconsistent behavior across runtime/test/container depending on env injection order.
   - Recommendation: pass timezone from validated config abstraction, avoid direct env reads in domain helpers.

3. **Rate-limit resilience depends on DB availability; falls back to in-memory store**
   - The rate limit service correctly tries DB persistence, but fallback to in-memory means multi-instance deployments can diverge under outage or partial failures.
   - Impact: medium-high for horizontally scaled environments.
   - Recommendation: enforce shared store only in production (fail closed), or add explicit mode flag + alerting when fallback is activated.

## Strengths observed
- Good auth hardening and safety checks with dedicated critical tests.
- Sensible environment schema validation with production safeguards.
- Frontend lint/tests are green and stable.
- Architecture guardrail checks exist and pass.

## Suggested next implementation order
1. Fix migration TLS settings (highest risk reduction).
2. Refactor report timezone helper to config-driven dependency.
3. Add production-safe mode for rate limiting fallback behavior.
4. Add CI stage for dependency vulnerability scanning in an environment with audit endpoint access.

## What is missing (for stronger enterprise readiness)
- Threat-model-driven security checklist tied to release pipeline.
- Continuous dependency vulnerability reporting (currently blocked in this environment).
- Synthetic production monitoring for auth/rate-limit degradation scenarios.
