# ZS ERP — Windows clothing offline build gate — 2026-10-26

Work on `fix/erp-customer-release-gates`; no main merge, deploy or customer/production data.

The Windows 2025 GitHub Actions runner documents PostgreSQL 17.11 preinstalled at `C:\Program Files\PostgreSQL\17`. The scoped job copies its `bin/lib/share` subtrees into `portable/runtime/postgres`, and copies Node 22 and npm from first-party `actions/setup-node@v4` into `portable/runtime/node`. It asserts the expected PostgreSQL version, runs copied executables, compares SHA256 hashes against their sources and creates a full per-file SHA256 manifest. Binaries are NOT committed to Git.

Packaging now fails on missing PostgreSQL library/share dependencies, Node/npm runtime, executable, renderer, backend or update scripts. On success the CI job exercises the actual **packaged** PostgreSQL first-run initialization, password creation, query, stop and restart with retained test row, backend / migrations startup with packaged Node, and `/health/live` on a local isolated port. It deletes temporary runtime database, logs and secrets before uploading `zs-clothing-offline-windows-x64` (3-day retention).

**Evidence policy:** Only final-HEAD completed Windows job + artifact prove a built package. These checks are not an Electron GUI launch, airplane-mode/disconnected network test, true customer data upgrade, or an actual physical POS / receipt printer test. Field UAT still needs a disposable color/size barcode sale, partial return, size exchange, shift cash reconciliation, inventory/COGS/GL reconciliation and actual update/fail/rollback preserving database, local secrets and client preferences.

**Decision rule:** BLOCKED until final-HEAD Windows packaging and actual offline runtime smoke succeed; then at most READY FOR FIELD UAT, not production ready.

## Real Windows runner observation (2026-10-26)

At commit `04d5dd6c`, the Windows runner **successfully generated the complete EXE** and validated backend, frontend and runtime layout. The actual PostgreSQL `initdb` smoke failed with `could not change permissions of directory D:/a/zs/zs/release/.../runtime/data: Permission denied` because the CI checkout directory has runner-specific ACL restrictions. The targeted regression now copies the complete packaged candidate to a fresh disposable directory under Windows `os.tmpdir()`, repeats the per-file hash checks, initializes the cluster and exercises restart/retained data + packaged backend/migrations there, and deletes the disposable installation. This is representative of a **writable customer portable install**, but is not proof of operation from a restricted installation location (e.g. `Program Files`). Installing in a protected or read-only directory remains unsupported until the application's data location is explicitly redesigned.
