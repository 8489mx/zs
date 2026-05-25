# Z Systems Development Scripts

- `Start-Dev-ZS.bat`: starts backend watch mode and frontend Vite for this repository.
- `Stop-Dev-ZS.bat`: stops only repo-owned dev processes (tracked PID files + repo/port checks).
- `Ensure-Dev-Database.ps1`: optional helper that creates `zs_dev` only if it does not already exist.

These scripts are additive and do not modify or control portable launcher/runtime processes.

