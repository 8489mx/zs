# Development Mode (Local, Hot Reload)

This mode is separate from portable mode and is intended for local coding and fast iteration.

## Ports and isolation

- Development frontend: `http://localhost:5173`
- Development backend: `http://localhost:3101`
- Development database: `zs_dev`
- Portable frontend (unchanged): `http://localhost:8080`
- Portable backend (unchanged): `http://localhost:3001`

Development mode does not use `portable/runtime/data` and does not edit portable launcher scripts.

## One-time setup

1. Install dependencies for `backend` and `frontend`.
2. Ensure PostgreSQL is running locally on `localhost:5432`.
3. Create the development database if missing:
   - Manual SQL: `CREATE DATABASE zs_dev;`
   - Optional helper: `powershell -ExecutionPolicy Bypass -File scripts/dev/Ensure-Dev-Database.ps1`

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

- Starts backend watch mode from repository on port `3101`
- Starts Vite frontend on port `5173`
- Stores tracked PIDs under `scripts/dev/.state`
- Refuses to start if required dev ports are already used by non-repo processes

## Stop development mode

Run:

```bat
scripts\dev\Stop-Dev-ZS.bat
```

What it does:

- Stops only tracked/repo-owned dev processes
- Checks ports `3101` and `5173` and stops only processes belonging to this repo
- Does not kill all `node.exe`
- Does not touch portable processes

## Avoid conflicts with portable mode

- Keep portable mode on its default ports (`8080`/`3001`) and dev mode on (`5173`/`3101`).
- Development backend uses its own DB name `zs_dev`.
- Development auth cookies are isolated by name (`zs_dev_session` / `zs_dev_csrf_token`), separate from portable defaults.

## When to build portable release

Use development mode for day-to-day coding and UI/backend iteration.

Build/package portable release only when you want to validate release behavior or produce customer-ready artifacts.

## If login fails in development

Check the following:

1. Backend is running on `http://localhost:3101`.
2. Frontend is running on `http://localhost:5173`.
3. `backend/.env.development` exists and contains `DATABASE_NAME=zs_dev`.
4. `zs_dev` database exists and backend DB credentials are valid.
5. Browser has fresh cookies for localhost (or clear site data and retry).

