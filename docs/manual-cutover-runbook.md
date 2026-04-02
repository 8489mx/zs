# Manual cutover runbook

## 1. Pre-window
- Confirm release candidate archive and generated cutover pack are the same build.
- Assign release manager, technical owner, rollback owner, and business approver.
- Fill `ops/manual-cutover-status.json` from the template before the window starts.
- Run `node scripts/validate-cutover-status.js` and fix any launch-blocking errors before the window starts.
- Confirm a fresh database backup exists and can be verified.

## 2. Window execution
- Put operators on notice that the deployment window has started.
- Deploy the backend package and the React build together.
- Start the app and verify the health endpoint.
- Run one admin login and one cashier login.
- Run one real sale, one purchase, one stock adjustment, and one stock transfer in the target environment.

## 3. Immediate validation
- Export a backup, verify it, and confirm restore metadata is sane.
- Review the release-closeout summary, cutover-status validation report, and route sweep report for regressions.
- Record all manual outcomes into `ops/manual-cutover-status.json`.

## 4. Stabilization hour
- Keep one technical owner online for the first hour.
- Watch logs, support intake, and cashier feedback.
- Capture any bug using `BUG_REPORT_TEMPLATE.csv`.
- Run `node scripts/post-launch-verification.js` at least once during the hour.
- Re-run `node scripts/release-readiness-check.js` after the cutover pack and post-launch report are updated if you need a final sign-off artifact.

## 5. Rollback rules
- Roll back immediately if login, sale posting, backup verification, or inventory posting is broken.
- Rollback ownership and trigger must be written in `ops/manual-cutover-status.json` before go-live.
