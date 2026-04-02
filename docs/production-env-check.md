# Production environment check

- Generated at: 2026-04-02T15:43:50.435Z
- Strict mode: yes
- Environment file: ../../zsystems-prod-drill-8BCSKq/.env.production.drill
- Passed: yes
- Errors: 0
- Warnings: 1

## Snapshot
- NODE_ENV: production
- Allowed origins: https://pilot.zsystems.example
- COOKIE_SECURE: true
- ENFORCE_SAME_ORIGIN_WRITES: true
- ALLOW_RESET_USERS: false
- ALLOW_RESTORE_USERS: false
- ALLOW_LEGACY_STATE_WRITE: false
- DEFAULT_ADMIN_PASSWORD present: false
- SESSION_SECRET length: 96

## Issues
- [warning] default_admin_password_blank: DEFAULT_ADMIN_PASSWORD is blank. This is acceptable only if your first-boot/admin seeding flow is controlled and documented.
