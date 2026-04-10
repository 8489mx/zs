# Phase 13 — Critical Flow Confidence

This phase starts the plan to move the project from pilot-ready toward sale-ready.

## What changed
- Added auth/session regression tests without extra third-party test runners
- Added coverage for login lockout behavior
- Added coverage for default-admin password detection in `buildMePayload`
- Added `npm run test:auth`
- Extended `npm run test:critical`

## Why this matters
The current project risk is no longer basic structure. The main risk is regression in critical flows. These tests reduce that risk in the auth path first.

## Next planned step
Phase 14 should cover end-to-end financial posting consistency across sale, purchase, return, treasury, and stock updates.
