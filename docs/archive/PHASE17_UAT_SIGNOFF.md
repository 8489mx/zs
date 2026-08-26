# Phase 17 - UAT and commercial sign-off

Use this checklist after deployment to the customer trial environment.

## Business-critical user acceptance
- Login works with the intended production admin account.
- Password change flow works on first login if forced.
- Create sale works and reduces stock correctly.
- Create purchase works and increases stock correctly.
- Create sales return restores stock and financial effect correctly.
- Create purchase return reduces stock and supplier effect correctly.
- Treasury movement appears in the expected register.
- Reports open without runtime errors for the current date range.

## Technical sign-off
- `npm run check:go-live` passes in backend.
- `npm run check:commercial-ready` passes in backend.
- `npm run qa:uat` passes in frontend.
- `.env` values are production-safe and not using placeholders.
- Backup and restore procedure was rehearsed once.

## Release decision
Only mark the release as commercially ready after both business-critical and technical sign-off are complete.
