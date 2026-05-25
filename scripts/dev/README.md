# Z Systems Development Scripts

- `Start-Dev-ZS.bat`: starts isolated dev PostgreSQL, backend watch mode, and frontend Vite for this repository.
- `Stop-Dev-ZS.bat`: stops only repo-owned dev backend/frontend and the dev PostgreSQL instance.
- `Ensure-Dev-Database.ps1`: optional helper that creates `zs_dev` on dev PostgreSQL only if missing.

Development defaults:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3101`
- PostgreSQL: `127.0.0.1:5433`
- Dev data folder: `scripts/dev/.runtime/postgres-data`
- DB name: `zs_dev`
- DB credentials: `postgres/postgres`

`POSTGRES_BIN` can be set if PostgreSQL binaries are not auto-detected:
- Example: `set POSTGRES_BIN=C:\Program Files\PostgreSQL\18\bin`

These scripts are additive and do not modify or control portable launcher/runtime/data processes.
