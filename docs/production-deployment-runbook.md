# Production deployment runbook

## 1. Prepare the host
- Create an application user such as `zsystems`.
- Install Node.js, npm, and the service manager used by your OS.
- Create `/opt/zsystems/current` for the app and `/etc/zsystems/zsystems.env` for runtime secrets.

## 2. Place the release bundle
- Extract the approved release package into `/opt/zsystems/current`.
- Copy `.env.production.example` into `/etc/zsystems/zsystems.env` and replace all placeholders.
- Verify file ownership so the service user can read the env file and write only to approved data/log paths.

## 3. Verify before boot
- Run `npm run env:production:check:strict`.
- Run `npm run verify:production:startup`.
- Run `npm run release:artifact:check` if the bundle was rebuilt on the target host.

## 4. Configure the process manager
- Use `deploy/systemd/zsystems.service.example` as the service template.
- Reload systemd after copying the unit file.
- Enable but do not start the service until the reverse proxy is ready.

## 5. Configure the reverse proxy
- Use `deploy/nginx/zsystems.conf.example` as the starting template.
- Replace the domain and certificate paths.
- Validate the config before reload.

## 6. Go-live sequence
1. Start the application service.
2. Confirm `/api/health` returns healthy.
3. Confirm login, sales, purchases, backup, and reporting flows from the approved smoke checklist.
4. Record operator sign-off in the cutover status file.

## 7. Rollback trigger
Rollback immediately if any of the following occurs:
- service fails guarded startup twice in a row
- health checks fail after proxy cutover
- authentication fails for the initial admin or launch operator
- database migration or restore validation reports corruption
