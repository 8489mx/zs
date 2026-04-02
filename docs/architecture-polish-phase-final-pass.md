# Architecture Polish Final Pass

## What changed
- Split `frontend/src/types/domain.ts` into focused domain model modules with a barrel export kept for backward compatibility.
- Extracted shared helpers and usage-check constants from `src/system-domain-service/branches-locations.js`.
- Extracted diagnostics wiring from `src/app/create-service-container.js`.

## Why it matters
- Type definitions are easier to scan and extend.
- Branch/location rules are easier to maintain and test.
- Service-container wiring is clearer and less noisy.

## Result
- Cleaner boundaries.
- Lower cognitive load.
- No behavior change.
