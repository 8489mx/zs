# Production readiness drill

- Generated at: 2026-04-02T15:43:50.505Z
- Temporary env file: /tmp/zsystems-prod-drill-8BCSKq/.env.production.drill
- Passed: yes

## Steps
- launch_gate_production: passed
  - Command: /opt/nvm/versions/node/v22.16.0/bin/node scripts/launch-gate.js --production-env-file /tmp/zsystems-prod-drill-8BCSKq/.env.production.drill
  - Stdout: Launch gate summary | { |   "ok": true, |   "findings": [ |     { |       "severity": "warn", |       "code": "default_admin_password_blank", |       "message": "DEFAULT_ADMIN_PASSWORD is blank. This is acceptable only if the first boot flow is controlled and documented" |     } |   ] | }
- production_env_check_strict: passed
  - Command: /opt/nvm/versions/node/v22.16.0/bin/node scripts/production-env-check.js --strict
  - Stdout: [production-env-check] wrote production-env-check-report.json | [production-env-check] wrote docs/production-env-check.md
- production_startup_check: passed
  - Command: /opt/nvm/versions/node/v22.16.0/bin/node scripts/production-startup-check.js --env-file /tmp/zsystems-prod-drill-8BCSKq/.env.production.drill
  - Stdout: [production-startup-check] wrote production-startup-check-report.json | [production-startup-check] wrote docs/production-startup-check-report.md

## Notes
- The production drill and launch gate now use the same temporary production env file.
- For real deployment, copy .env.production.example to .env.production on the target machine and replace placeholders with real values.
