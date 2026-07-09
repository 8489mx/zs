# Live SaaS Operations Checklist

This document provides a single source of truth for Cloud SaaS deployment, operations, monitoring, and emergency procedures on Hostinger/Supabase.

## 1. Production Environment Safety Checklist

Before deploying or scaling the SaaS offering, verify the environment (`.env` or Hostinger variables) adheres to the following constraints.

> [!WARNING]
> Dev configuration in production can lead to severe security breaches. Ensure the values below are exactly as stated.

- [x] `APP_MODE=CLOUD_SAAS`: Enforces cloud-only rules and disables local portable scripts (e.g., PowerShell updates).
- [x] `NODE_ENV=production`: Enables optimizations and production-level logging.
- [x] `ALLOW_SESSION_ID_HEADER=false`: Prevents bypassing cookie security using direct header injection.
- [x] `ENABLE_BOOTSTRAP_ADMIN=false`: (Important!) Disable the bootstrap seeder. If it was enabled initially, turn it off.
- [x] `ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION=false`: Prevents accidental or forced re-seeding of the root owner in production.
- [x] `PUBLIC_TRIAL_DEBUG_CREDENTIALS=false`: Ensures temporary passwords are not returned in the API response payload.
- [x] `SESSION_COOKIE_SECURE=true`: Only allows cookies over HTTPS.
- [x] `SESSION_COOKIE_SAME_SITE=lax`: Given the Hostinger configuration (`api.karimzakaria.com` and `app.karimzakaria.com`), `lax` allows cookies to flow properly during top-level navigation while `strict` may block cross-subdomain top-level navigation. `lax` is secure if `SESSION_COOKIE_DOMAIN=karimzakaria.com` is configured correctly, and the CSRF token handles cross-site request forgery protection.
- [x] `DATABASE_SSL=true`: Required for secure communication with Supabase.

## 2. Supabase Connection and Operations Review

- **SSL Connection**: Verified. Ensure `DATABASE_SSL_REJECT_UNAUTHORIZED=true` and `DATABASE_SSL_CA_CERT_B64` is configured if required by your Supabase cluster.
- **Log Safety**: Database connection strings are properly sanitized in `database.module.ts` and `Kysely` logs are disabled (`DATABASE_LOGGING=false`).
- **Data Isolation**: All access is strictly gated by `tenant_id` at the service layer, validated via `SessionAuthGuard`.
- **Connection Limits**: Monitor the Supabase dashboard. By default, Supabase provides connection pooling (PgBouncer/Supavisor). Ensure `DATABASE_HOST` points to the pooler (e.g., port 6543 or IPv4 pooler endpoint) to avoid exhaustion under heavy SaaS load.

## 3. Hostinger Deployment Steps

Currently, CI/CD relies on GitHub Actions for build checks (`ci.yml`), but deployment to Hostinger may involve a manual pull or FTP/SSH strategy depending on Hostinger plan limits.

### Manual / Semi-Automated Deployment Flow:
1. SSH into the Hostinger VPS or Terminal.
2. Navigate to the application root.
3. Pull the latest `main` branch.
4. Run `npm ci` in `backend` and `frontend`.
5. Run `npm run build` in both directories.
6. Run `npm run migration:run` in `backend` to update the Supabase schema safely.
7. Restart the Node process via PM2 (e.g., `pm2 restart api`).

> [!NOTE]
> Consider setting up a fully automated CD pipeline using `appleboy/ssh-action` to trigger this sequence on merge to `main`.

## 4. Tenant Lifecycle Verification Checklist

Whenever releasing a major update to the SaaS billing engine, run a manual or automated smoke test against a dedicated test tenant (e.g., `live-verification-test`). **Never test on real customer tenants.**

- [ ] **Signup**: Trigger `/api/public/trial-signup`. Verify the tenant is created, the owner is seeded, and an email is dispatched.
- [ ] **Login**: Authenticate and confirm access.
- [ ] **SaaS Activation**: Use the SaaS Admin dashboard to assign a paid plan to the tenant.
- [ ] **Expiry**: Manually update the `ends_at` date in the database or via API to an expired date.
- [ ] **Grace Period Check**: Verify login still works if within `SAAS_DEFAULT_GRACE_DAYS`.
- [ ] **Lockout Check**: Shift the `ends_at` date past the grace period. Verify login is blocked with `SubscriptionExpired` or `PaymentRequired`.
- [ ] **Suspension**: Manually set status to `suspended` and verify immediate lockout.

## 5. Offline Updates in Cloud Mode

- The endpoints `/api/local-updates/apply` and `/api/local-updates/apply-local-zip` are protected by `OfflineUpdatesProtectedController`.
- They are hardcoded to throw `BadRequestException` if `APP_MODE` is not `SELF_CONTAINED` or `PORTABLE_MODE=true`.
- PowerShell scripts (`ApplyAndRestart.ps1`) are never spawned in `CLOUD_SAAS`.

## 6. Backup and Restore Strategy

### Database Backups (Supabase)
For SaaS, **Supabase is the primary disaster recovery mechanism**.
- Supabase performs automatic daily backups (Point-in-Time Recovery available on Pro/Enterprise plans).
- Restore operations should strictly occur via the Supabase dashboard.

### Application Backups (ZIP Exports)
- The application's local `SettingsBackupService` exports ZIP backups.
- In SaaS mode, this allows tenants to export their *own* data for peace of mind.
- **Do not use the in-app restore tool on production Supabase.** Use it only for migrating data into a local Portable environment.

## 7. Emergency Rollback Procedures

If a deployment breaks the production SaaS:
1. Identify the last stable commit.
2. SSH into Hostinger.
3. `git checkout <stable-commit-hash>`
4. `npm ci` and `npm run build`.
5. Restart PM2.
6. If the database schema was modified destructively, use the Supabase Dashboard to restore to the nearest Point-in-Time prior to the deployment.

## 8. Remaining Risks and Recommendations Before Public Launch

1. **Bootstrap Admin Enabled in Prod**: The live configuration `hostinger-api.production.env` currently has `ENABLE_BOOTSTRAP_ADMIN=true`. This must be set to `false` immediately to prevent accidental admin resets.
2. **Automated CD**: Deployments are currently not fully automated, which could lead to human error during manual SSH deployments.
3. **SMTP Verification**: If SMTP fails, the current public trial signup throws an error. Ensure robust SMTP credentials are in place to prevent signup blocking.

## 9. Production Env Migration Checklist

When migrating to a new domain or environment, ensure you use the securely tracked ackend/.env.production.example template.

- **Never commit the real .local.env or .production.env to Git.** They are properly ignored.
- When changing domains, update:
  - CORS_ORIGINS (e.g. https://new-app.com)
  - SESSION_COOKIE_DOMAIN (e.g. .new-app.com)
  - APP_LOGIN_URL (e.g. https://new-app.com/login)
  - Frontend VITE_API_BASE_URL (points to the new API)
- **Do not change DB credentials** unless the database itself has moved.
- After migration, perform the following validation checks:
  - Successful Login via Frontend (validates CORS + Cookies).
  - Stateful Operations (validates CSRF protection works cross-subdomain/domain).
  - /health/live and /health/ready check.

## 10. Supabase Connection Pooling

For scalable SaaS operations, connections to Supabase should be managed properly to avoid exhausting database connection limits:

- **App Runtime Connection (Pooled):** The main application runtime MUST connect to Supabase via its Connection Pooler (PgBouncer/Supavisor). Ensure `DATABASE_HOST` points to the pooler address (usually IPv4 or port 6543) and not the direct DB address.
- **Recommended Env Vars:**
  - `DATABASE_POOL_MAX=20` (Adjust based on Supabase plan limits and number of running Node instances)
  - `DATABASE_POOL_IDLE_TIMEOUT_MS=10000`
  - `DATABASE_POOL_CONNECTION_TIMEOUT_MS=10000`
- **Migration Connection (Direct):** When running `npm run migration:run`, you should temporarily use the *Direct Connection* (port 5432) to avoid transaction locks or statement timeout issues through the pooler.
- **Troubleshooting Connection Errors:** If you see `timeout` or `too many clients` errors in Kysely logs, ensure your instances aren't exceeding the max pooled connections allowed by your Supabase tier. Verify `DATABASE_POOL_MAX` is appropriately scaled across your Hostinger PM2 cluster.

## 11. Monitoring and Alerts

For a Cloud SaaS environment, proactive monitoring is critical to detect and resolve issues before they affect multiple tenants.

### Health Check URLs
- **Liveness (/api/health/live):** Returns 200 OK if the Node.js process is running. Suitable for uptime monitoring (e.g., UptimeRobot, Pingdom). Does not query the database.
- **Readiness (/api/health/ready):** Returns 200 OK only if the application is ready to accept traffic and the database connection is healthy. Suitable for load balancer routing or Kubernetes readiness probes.

### What to Monitor & Alert Thresholds
- **Uptime Monitor:** Ping /api/health/live every 1 minute. Alert if down for >2 minutes.
- **Database Health:** Ping /api/health/ready every 1 minute. Alert if down for >2 minutes.
- **Error Tracking (Sentry):** Use SENTRY_DSN and ERROR_TRACKING_ENABLED=true to capture unhandled exceptions automatically. Set an alert if the error rate exceeds 1% of total requests or if a critical boot error occurs.

### Where to Find Logs
- **Hostinger Logs:** If using PM2, logs are usually viewed via pm2 logs api.
- **File Logs:** The system logger (pino) writes warnings and errors to ackend/logs/system-errors.log.
- **Support Bundle:** Tenants or admins can generate a support bundle which securely extracts the last SUPPORT_BUNDLE_LOG_TAIL_LINES (default 2000) from the logs. Secrets such as JWTs and passwords are automatically redacted.

### What NOT to Log
- Never log plain text passwords, session tokens, or JWTs. The logger has basic redaction, but avoid passing sensitive objects to logger.info() directly.
