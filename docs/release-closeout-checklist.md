# Release closeout checklist

## 1) Fast confidence
- Run `npm run frontend:qa:phase60`
- Run `npm run frontend:build`
- Run `npm test`
- Run `npm run smoke-test`
- Run `npm run test:integration`

## 2) Strict closeout
- Run `npm install` in the project root
- Run `npm run cutover:validate` after filling `ops/manual-cutover-status.json`
- Run `npm run release:closeout`
- Run `npm run release:ready` if you need a final sign-off summary outside strict closeout
- Review:
  - `release-audit-report.json`
  - `final-regression-report.json`
  - `release-closeout-report.json`
  - `docs/release-closeout-summary.md`
  - `docs/cutover-status-validation.md`
  - `docs/release-readiness-summary.md`

## 3) Manual operator walk-through
- Login with admin and cashier accounts
- Create one sale, edit it, print it, and cancel an allowed case
- Create one purchase, edit it, print it, and cancel an allowed case
- Create one sale return and one purchase return
- Open a cash drawer shift and close it
- Run one stock adjustment and one stock transfer
- Save settings, export backup, verify backup, and restore a staging copy

## 4) Cutover readiness
- Confirm React build is the primary served frontend
- Confirm legacy fallback is disabled unless explicitly required
- Archive the latest backup before go-live
- Keep a rollback owner and rollback timestamp ready
