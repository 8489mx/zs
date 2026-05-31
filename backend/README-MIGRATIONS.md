# Migration Commands (Environment-Aware)

Use these commands to ensure migrations are applied to the correct local database.

- `npm run migration:run:dev`
Applies migrations to the developer DB from `.env.development`.

- `npm run migration:list:dev`
Lists migration status for `.env.development`.

- `npm run migration:run:normal`
Applies migrations to the normal/local DB from `.env`.

- `npm run migration:list:normal`
Lists migration status for `.env`.

- `npm run migration:run:portable`
Applies migrations to the portable DB from `.env.portable`.
This command fails clearly if `.env.portable` is missing.

- `npm run migration:list:portable`
Lists migration status for `.env.portable`.
This command fails clearly if `.env.portable` is missing.

- `npm run migration:run:all-local`
Applies migrations in sequence to:
1. `.env.development`
2. `.env`
3. `.env.portable` (only if it exists)

This command does not include SaaS/production targets.

- `npm run migration:list:all-local`
Lists migration status in sequence for:
1. `.env.development`
2. `.env`
3. `.env.portable` (only if it exists)

This command does not include SaaS/production targets.

## Notes

- Do not manually copy env files to run migrations.
- Migration commands use the same database config format as the backend app:
  `DATABASE_HOST/PORT/NAME/USER/PASSWORD` with `DB_*` fallback aliases.
  `DATABASE_URL` is optional and not required by these commands.
- Commands print the selected env file and a sanitized database target.
- Commands also print the SSL mode used by the migration DB connection.
- Passwords are never printed in command output.
- If the developer UI does not reflect migration changes:
1. Run `npm run migration:run:dev`
2. Restart the backend process

## Hosted Postgres / Supabase SSL

For hosted Postgres poolers that fail from the local migration runner with:

`self-signed certificate in certificate chain`

set one explicit SSL mode in the env file used by the migration command:

```env
DATABASE_SSL_MODE=no-verify
```

or:

```env
PGSSLMODE=no-verify
```

Then run the env-aware migration command, for example:

```bash
npm run migration:run:normal
```

Supported migration SSL modes:

- `DATABASE_SSL_MODE=disable` or `PGSSLMODE=disable`: disables SSL.
- `DATABASE_SSL_MODE=require` or `PGSSLMODE=require`: enables SSL certificate verification.
- `DATABASE_SSL_MODE=no-verify` or `PGSSLMODE=no-verify`: enables SSL with `rejectUnauthorized: false`.

`DATABASE_SSL_REJECT_UNAUTHORIZED=false` is also supported when SSL is enabled.

Use `no-verify` only for hosted poolers that fail with a self-signed certificate chain from the local migration runner. Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0` globally.
