# Production readiness phase

## What was closed in this pass

1. Production environment template was expanded and documented in `.env.production.example`.
2. Startup and environment checks now support `PRODUCTION_ENV_FILE` so deployment checks can pass without committing `.env.production` into source control.
3. Source handoff verification now validates the generated source archive instead of failing on local development `node_modules` folders.
4. A production readiness drill was added to prove strict env + startup checks pass using a temporary secure env file.
5. A real backup / restore drill was added using a temporary database, backup export, verify, dry-run restore, real restore, post-restore validation, and rollback copy preparation.

## New commands

- `npm run production:drill`
- `npm run source:clean`
- `npm run backup:drill`
- `npm run go-live:pilot`

## Deployment rule

- Keep `.env.production.example` in source.
- Create the real `.env.production` only on the target machine.
- Use `PRODUCTION_ENV_FILE=/absolute/path/to/.env.production` when running checks from automation or another folder.

## Minimum pre-sale gate

Run in order:

1. `npm run production:drill`
2. `npm run source:clean`
3. `npm run backup:drill`
4. `npm test`
5. `npm --prefix frontend run build`

If all pass, the project is ready for a controlled paid pilot deployment.
