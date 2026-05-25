# Development Mode (Local, Hot Reload)

This mode is separate from portable mode and is intended for local coding and fast iteration.

## Ports and isolation

- Development frontend: `http://localhost:5173`
- Development backend: `http://localhost:3101`
- Development PostgreSQL: `127.0.0.1:5433`
- Development database: `zs_dev`
- Development DB credentials: `postgres / postgres`
- Development data directory: `scripts/dev/.runtime/postgres-data`
- Portable frontend (unchanged): `http://localhost:8080`
- Portable backend (unchanged): `http://localhost:3001`
- System PostgreSQL service on `5432` is intentionally not used by dev mode.

Development mode does not use `portable/runtime/data` and does not edit portable launcher scripts.

## One-time setup

1. Install dependencies for `backend` and `frontend`.
2. Ensure PostgreSQL binaries are available (auto-detect supported paths or set `POSTGRES_BIN`).
3. Optional if auto-detection fails:
   - `set POSTGRES_BIN=C:\Program Files\PostgreSQL\18\bin`

## Environment files

Start script auto-creates local env files from templates if missing:

- `backend/.env.development` from `backend/.env.development.example`
- `frontend/.env.development` from `frontend/.env.development.example`

Default development login values in backend template:

- Username: `dev`
- Password: `1`

## Start development mode

Run:

```bat
scripts\dev\Start-Dev-ZS.bat
```

What it does:

- Starts isolated dev PostgreSQL on `127.0.0.1:5433` with data under `scripts/dev/.runtime/postgres-data`
- Initializes dev PostgreSQL data on first run only
- Creates `zs_dev` only if missing (never drops/resets existing dev data)
- Starts backend watch mode from repository on port `3101`
- Starts Vite frontend on port `5173`
- Stores tracked PIDs under `scripts/dev/.state`
- Refuses to start if required dev ports (`5433`, `3101`, `5173`) are used by unrelated processes

## Stop development mode

Run:

```bat
scripts\dev\Stop-Dev-ZS.bat
```

What it does:

- Stops only tracked/repo-owned dev processes
- Stops the isolated dev PostgreSQL instance tied to `scripts/dev/.runtime/postgres-data`
- Checks ports `5433`, `3101`, and `5173` and stops only processes belonging to this dev workflow
- Does not kill all `node.exe`
- Does not stop system PostgreSQL on `5432`
- Does not touch portable processes

## Avoid conflicts with portable mode

- Keep portable mode on its default ports (`8080`/`3001`) and dev mode on (`5173`/`3101`).
- Dev PostgreSQL runs on `5433`, separate from system PostgreSQL on `5432`.
- Development backend uses its own DB name `zs_dev`.
- Development auth cookies are isolated by name (`zs_dev_session` / `zs_dev_csrf_token`), separate from portable defaults.

## When to build portable release

Use development mode for day-to-day coding and UI/backend iteration.

Build/package portable release only when you want to validate release behavior or produce customer-ready artifacts.

## If login fails in development

Check the following:

1. Backend is running on `http://localhost:3101`.
2. Frontend is running on `http://localhost:5173`.
3. Dev PostgreSQL is listening on `127.0.0.1:5433`.
4. `backend/.env.development` contains `DATABASE_HOST=127.0.0.1` and `DATABASE_PORT=5433`.
5. `backend/.env.development` contains `DATABASE_NAME=zs_dev`.
6. `zs_dev` database exists and backend DB credentials are valid (`postgres/postgres` by default).
7. If binaries are not found, set `POSTGRES_BIN` and re-run start script.
8. Browser has fresh cookies for localhost (or clear site data and retry).
