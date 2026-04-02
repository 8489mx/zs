# Launch Candidate Guide

## Scope
This release candidate is the single-store online edition.
It is intended for controlled pilot and limited paid rollout after the checks below pass.

## Required checks
1. `npm test`
2. `npm run smoke-test`
3. `npm run test:integration`
4. `npm run frontend:build`
5. `npm run audit:release:strict`
6. `npm run launch:gate`
7. `npm run env:production:check:strict`
8. `npm run verify:production:startup`

## Manual operating checks
- Login as admin and cashier
- Open shift
- Cash sale
- Credit sale
- Return sale
- Edit invoice with manager PIN
- Cancel invoice with manager PIN
- Close shift with exact count and with variance note
- Print receipt preview

## Release signoff
Do not mark this build as sellable unless:
- all automated checks pass
- no critical permission leak is open
- no blocker exists in sale, return, edit, cancel, or close-shift flows
- the first-day setup can be completed without branch/location confusion
