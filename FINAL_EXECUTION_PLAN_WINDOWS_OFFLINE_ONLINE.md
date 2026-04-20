# FINAL EXECUTION PLAN — Windows Launcher/Installer + Offline/Online Modes

## 0) Scope & Constraints
- **No implementation in this phase** (plan-only).
- Same codebase for both offline and online.
- No Electron.
- No architecture fork.
- Existing offline scripts remain source-of-truth for operations.

---

## 1) Windows Launcher / Installer

### Runtime UX target
**What customer sees (final UX):**
1. Install once using Windows installer.
2. Click **Start ZS** shortcut:
   - Launcher checks Docker Desktop.
   - If Docker not running, launcher starts it and waits until engine is ready.
   - Launcher runs offline stack.
   - Launcher opens browser automatically (`http://127.0.0.1:8080` by default).
3. Click **Stop ZS** shortcut to stop services.

### Technical shape
- Launcher layer = `BAT + PowerShell` scripts.
- Installer = **Inno Setup**.
- No EXE app wrapper required beyond installer + shortcuts.

### Docker handling
- Start launcher:
  - detect `docker` CLI
  - detect Docker engine readiness
  - run offline compose (`up -d`)
- Stop launcher:
  - run offline compose (`down`)

### Browser auto-open
- Yes, Start launcher opens default browser after health check success.

---

## 2) Offline / Online mode (same codebase)

### Mode contract
- `APP_MODE=offline|online`

### Rule
- Switching mode must be env-only (no code fork).

### Minimum env contract
**Common:**
- `APP_MODE`
- `NODE_ENV`
- `APP_HOST`
- `APP_PORT`
- `SESSION_CSRF_SECRET`

**DB for both modes:**
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `DATABASE_SSL_CA_CERT` (optional)

### Guard strategy
- Offline guard:
  - requires local docker DB host (`postgres`) in offline compose path.
  - rejects accidental external DB host in offline launcher flow.
- Online guard:
  - allows external DB host.
  - validates SSL-related env consistency.
- Shared guard:
  - fail-fast with explicit error messages for missing/conflicting env.

---

## 3) Database strategy

### Offline
- PostgreSQL runs locally inside `docker-compose.offline.yml`.
- DB data lives in local docker volume.
- First install/start:
  - bring up postgres
  - backend runs migrations automatically
  - app becomes ready without manual DB steps.

### Online
- PostgreSQL external/hosted (VPS/cloud/managed PG).
- Same backend image/runtime; only env differs.

### Supabase independence (offline)
- Offline release checklist blocks remote DB endpoints/secrets.
- Offline env templates are local-only.
- Runtime audit step confirms no required remote DB/auth/storage in offline path.

### Remote dependency statement
- Target outcome of this track:
  - Offline mode: no required runtime remote dependency.
  - Online mode: remote DB expected by design.

---

## 4) First-run admin / bootstrap

### First run behavior target
- No hardcoded fixed super-admin credentials shipped.
- System starts with minimal safe bootstrap state.
- First admin account is created only through first-run setup flow.

### Offline & online relation
- Same first-run logic in both modes.
- Mode affects infrastructure (DB location), not identity bootstrap semantics.

### Guard
- Ensure `ENABLE_BOOTSTRAP_ADMIN` defaults remain safe for production-grade usage.
- First-run setup completion gates privileged access.

---

## 5) Update / Backup / Rollback

### What stays
- Existing scripts remain source-of-truth:
  - install/start/stop/backup/restore/upgrade/rollback

### What changes
- Launcher/installer only orchestrate these scripts (wrapper layer).
- No replacement of existing operational scripts.

### Impact guarantee
- Current CLI runbooks stay valid.
- GUI-like Windows shortcuts provide easier entrypoint only.

---

## 6) Hosted deployment readiness

### Kept open by design
- `APP_MODE=online` path remains first-class.
- `docker-compose.prod.yml` remains usable for hosted deployment.
- No offline-only hardcode in core app services.

### Later hosted needs (outside this track)
- Domain + TLS termination
- secrets manager / vault integration
- monitoring + alerts
- backup/restore policy at infra level

### Non-goal in this track
- Full cloud automation stack (Terraform/K8s) is not included.

---

## 7) Developer workflow

### Source-based continuity
- Repo remains editable source code.
- No binary-only workflow introduced for dev.
- You can still zip source and send for iterative modifications.

### Delivery split
- **Customer delivery:** installer + packaged offline release bundle.
- **Owner/dev delivery:** full source repository + scripts + docs.

---

## 8) Execution plan (small PRs, low-risk to high-risk)

## Step 1 — Finalize mode contract docs
- **Goal:** freeze env contract for `APP_MODE` and mode-specific rules.
- **Expected files:**
  - `README.md`
  - `WINDOWS_LAUNCHER_INSTALLER_PLAN.md`
  - new `MODE_CONTRACT.md`
- **Risks:** mismatch between docs and runtime behavior.
- **Verification:** doc review checklist approved.

## Step 2 — Config/env guards in backend startup
- **Goal:** implement fail-fast validation for offline/online misconfiguration.
- **Expected files:**
  - `backend/src/config/env.schema.ts`
  - `backend/src/config/database.config.ts`
  - guard tests under `backend/test/critical/*`
- **Risks:** over-strict guard may block valid hosted configs.
- **Verification:**
  - typecheck
  - critical tests
  - positive+negative env validation tests.

## Step 3 — Windows launcher scripts (Start/Stop)
- **Goal:** no-terminal start/stop UX for offline mode.
- **Expected files:**
  - `windows/Start-ZS.bat`
  - `windows/Stop-ZS.bat`
  - `windows/lib/*.ps1`
- **Risks:** Docker startup timing/race issues.
- **Verification:**
  - manual Windows smoke test
  - logs under `%ProgramData%\ZS\logs`
  - health endpoint check + browser auto-open.

## Step 4 — Installer (Inno Setup)
- **Goal:** install + create shortcuts + uninstall cleanly.
- **Expected files:**
  - `installer/windows/zs-offline.iss`
  - packaging helper scripts/docs
- **Risks:** path/permissions issues on different Windows versions.
- **Verification:** clean VM install/uninstall cycle.

## Step 5 — Offline supabase-independence audit artifacts
- **Goal:** prove offline runtime has no required remote dependency.
- **Expected files:**
  - `OFFLINE_SUPABASE_INDEPENDENCE_CHECKLIST.md`
  - audit script/report outputs
- **Risks:** hidden runtime remote calls in edge paths.
- **Verification:** checklist pass + grep/static audit + runtime smoke.

## Step 6 — End-to-end operational validation
- **Goal:** validate install→start→first-run→backup→upgrade→rollback.
- **Expected files:**
  - `OFFLINE_DEPLOYMENT_RUNBOOK.md` updates
  - `LAUNCH_READINESS_GATE.md` updates
- **Risks:** rollback edge-case data issues.
- **Verification:** full dry-run on test machine with signoff log.

---

## 9) Definition of Done (DoD)
We consider this track successful only if all are true:
1. Windows customer can install and run via shortcuts without terminal commands.
2. Start launcher handles Docker readiness and opens browser automatically.
3. Stop launcher shuts down stack cleanly.
4. Same codebase supports both `APP_MODE=offline` and `APP_MODE=online` via env only.
5. Offline mode uses local PostgreSQL in docker stack and passes first-run readiness.
6. Online mode remains valid with hosted PostgreSQL configuration.
7. No fixed shipped super-admin credentials; first admin created via first-run flow.
8. Backup/restore/upgrade/rollback path still works and remains source-of-truth.
9. Offline Supabase-independence checklist passes.
10. Launch gate checklist passes on a real Windows test environment.

---

## Executive summary (very short)
### This track will deliver
- Easy Windows Start/Stop + installer UX.
- Dual-mode runtime (`offline`/`online`) from one codebase via env only.
- Local PostgreSQL offline provisioning + hosted readiness preserved.

### This track will NOT do
- No Electron rewrite.
- No architecture fork.
- No replacement of existing offline scripts.
- No full cloud IaC platform rollout.
