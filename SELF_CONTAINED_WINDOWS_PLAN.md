# Self-Contained Windows Plan (No Docker, No Terminal)

## 1) Final Architecture Recommendation

## Choice
**Electron + Local Backend Process + Embedded PostgreSQL Runtime + electron-builder Installer**

## Why this choice for current project
- Backend already Node/NestJS ⇒ easiest to run as local child process with Electron.
- Frontend already React/Vite ⇒ easy to load built assets in Electron window.
- Packaging/Installer ecosystem in Electron is mature on Windows (NSIS via electron-builder).
- Minimal disruption to existing business logic compared with full migration to another stack.

## Why not Tauri now
- Tauri is lighter, but sidecar process and Node backend packaging path is more custom here.
- Higher integration effort for current codebase and team velocity right now.

---

## 2) Database Decision

## Decision: **Embedded PostgreSQL runtime** (not Docker, not manual install)

### Rationale
- Preserves existing SQL/migrations/domain logic with minimal backend rewrite.
- Avoids risky migration from PostgreSQL semantics to SQLite (many queries/helpers/migrations تعتمد على PG behavior).
- Satisfies: no Docker + no manual PostgreSQL installation.

### Tradeoff
- Bigger installer size than SQLite.
- More runtime management responsibilities (start/stop/init DB) handled by desktop orchestrator.

---

## 3) Backend Runtime Strategy

- Backend remains NestJS process.
- In desktop mode, orchestrator launches backend as **local child process**.
- Backend binds localhost only (e.g. `127.0.0.1:<dynamic_or_fixed_port>`).
- Env injected by desktop layer only (dataDir-based paths, DB creds, mode flags).
- Health-check gate before showing app “ready”.

---

## 4) Frontend Runtime Strategy

- Frontend remains React build output.
- Electron window loads local static bundle (no dev server in production build).
- API calls target local backend (`http://127.0.0.1:<port>`).
- In dev mode, workflow remains unchanged (frontend+backend normal dev scripts).

---

## 5) Source Cleanliness & Separation (Critical Constraint)

- Keep `frontend/` clean and source-focused.
- Keep `backend/` clean and source-focused.
- Put all desktop/runtime/installer orchestration in isolated folders only.

### Allowed minimal changes inside frontend/backend
- Backend: tiny adapter/config hooks for desktop env profile (no business logic relocation).
- Frontend: minimal runtime API base wiring if needed (already mostly relative API).

### Not allowed
- No packaging scripts mixed deep inside frontend/business features.
- No migration of core business logic to desktop wrapper.

---

## 6) Installer Strategy

- Tool: **electron-builder**.
- Output: single Windows installer (`.exe`) using NSIS target.
- Installer installs app + embedded runtime payload (including PG runtime files).
- Desktop/start menu shortcuts created automatically.
- First launch triggers local runtime initialization.

---

## 7) Update Strategy

## Phase-1 (safe baseline)
- In-app update checker disabled by default.
- Manual “download new installer” upgrade path.
- Upgrade keeps data directory intact.

## Phase-2 (optional)
- Add signed auto-updates after baseline stability.

---

## 8) First-Run Admin Strategy

- No injected fixed super-admin credentials.
- First-run wizard enforces creating first admin account.
- Backend bootstrap safety flags stay strict.
- Desktop layer only orchestrates first-run state, not account logic.

---

## 9) Backup / Restore Strategy

- Built-in backup/restore actions in desktop menu or settings bridge.
- Backups saved to user data folder (or chosen folder) as timestamped files.
- Restore requires confirmation + graceful service restart.
- Reuse existing backend backup logic where possible.

---

## 10) Developer Workflow After Transformation

- `frontend/` and `backend/` still independently zip/send-able to AI tools.
- Desktop work lives in separate directories.
- Dev commands remain:
  - backend dev
  - frontend dev
  - optional desktop dev (wrapper only)
- CI for core source remains independent of desktop packaging pipeline.

---

## 11) Step-by-Step Execution Plan (Small Reviewable PRs)

## Step A — Skeleton (no behavior changes)
- Add isolated folders and docs only.
- Define contracts and env mapping.
- **Risk:** low.
- **Validation:** docs review + no source behavior change.

## Step B — Desktop orchestrator MVP
- Add Electron app shell that can:
  - start embedded PG process
  - start backend process
  - wait health
  - open frontend window
- **Risk:** medium.
- **Validation:** local launch smoke on Windows VM.

## Step C — Embedded PostgreSQL bootstrap
- Add runtime management for PG initdb/start/stop/data-dir.
- Add first-run DB initialization flow.
- **Risk:** medium-high.
- **Validation:** cold start on clean VM + restart persistence.

## Step D — Installer packaging
- Configure electron-builder NSIS.
- Bundle desktop + backend dist + frontend dist + PG runtime.
- **Risk:** medium.
- **Validation:** install/uninstall/reinstall tests.

## Step E — First-run admin + hardening checks
- Wire first-run readiness checks and enforce admin creation path.
- **Risk:** medium.
- **Validation:** first-run test matrix.

## Step F — Backup/Restore UX integration
- Expose backup/restore actions from desktop wrapper.
- **Risk:** medium.
- **Validation:** backup-restore integrity tests.

## Step G — Release/Signoff pipeline
- Add desktop release checklist and launch signoff artifacts.
- **Risk:** low.
- **Validation:** signed artifact + full checklist pass.

---

## 12) What changes minimally in frontend/backend

## Backend (minimal)
- Config profile hooks for desktop env values.
- Startup orchestration hooks only if required.
- No core domain/service rewrites.

## Frontend (minimal)
- Ensure production API base works with localhost backend in desktop mode.
- No feature/business module relocation.

---

## 13) Proposed Folder Structure

```text
frontend/                    # unchanged core app source
backend/                     # unchanged core API source

desktop/
  app/                       # electron main/preload/process manager
  bridge/                    # ipc contracts to frontend shell
  config/                    # desktop runtime config mapping

runtime/
  postgres/                  # embedded postgres binaries + init templates
  scripts/                   # runtime start/stop/init helpers

packaging/
  electron-builder.yml       # build targets, files, NSIS config
  assets/                    # icons, metadata, version resources

installer/
  windows/
    nsis/                    # optional custom NSIS fragments
    docs/                    # installer notes and QA checklist

release/
  desktop/                   # generated installers and checksums
```

---

## Executive Summary (very short)

## What this path gains
- True Windows self-contained product (no Docker, no terminal).
- Preserves current backend/frontend with minimal invasive changes.
- Produces sellable installer UX.

## What this path loses
- Larger installer size (embedded PostgreSQL).
- Extra desktop/runtime maintenance layer.
- More QA matrix vs pure web deployment.
