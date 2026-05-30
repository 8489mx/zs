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
- Passwords are never printed in command output.
- If the developer UI does not reflect migration changes:
1. Run `npm run migration:run:dev`
2. Restart the backend process
